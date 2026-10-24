import os
from pathlib import Path

import pandas as pd
import psycopg

ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = ROOT / "data" / "train.csv"
DATABASE_URL = os.environ["DATABASE_URL"]


def main():
    frame = pd.read_csv(CSV_PATH, parse_dates=["date"])
    monthly = (
        frame.assign(month=frame["date"].dt.to_period("M").dt.to_timestamp())
        .groupby(["item", "store", "month"], as_index=False)["sales"]
        .sum()
    )
    rows = [
        (
            int(row.item),
            int(row.store),
            "STOCK_OUT",
            -int(row.sales),
            500,
            "Historical monthly POS aggregate",
            row.month.to_pydatetime(),
        )
        for row in monthly.itertuples(index=False)
    ]

    with psycopg.connect(DATABASE_URL) as connection:
        with connection.cursor() as cursor:
            cursor.executemany(
                """
                INSERT INTO stock_transactions (
                    product_id, warehouse_id, performed_by_user_id,
                    transaction_type, quantity_change, balance_after,
                    notes, transaction_time
                )
                VALUES (%s, %s, 1, %s, %s, %s, %s, %s)
                """,
                rows,
            )

    print(f"Imported {len(rows)} monthly product/store sales aggregates.")


if __name__ == "__main__":
    main()

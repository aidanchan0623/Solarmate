def ensure_sqlite_schema(engine) -> None:
    """Tiny local migration helper for the prototype SQLite database."""
    if engine.dialect.name != "sqlite":
        return

    with engine.begin() as connection:
        profile_columns = {
            row[1]
            for row in connection.exec_driver_sql("PRAGMA table_info(prosumer_profiles)").fetchall()
        }
        if "device_id" not in profile_columns:
            connection.exec_driver_sql("ALTER TABLE prosumer_profiles ADD COLUMN device_id VARCHAR(120)")

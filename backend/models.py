from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(80), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)
    has_completed_onboarding: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    prosumer_profile: Mapped["ProsumerProfile"] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        uselist=False,
    )
    consumer_profile: Mapped["ConsumerProfile"] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        uselist=False,
    )
    export_records: Mapped[list["ProsumerExportRecord"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    daily_exports: Mapped[list["ProsumerDailyExport"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    daily_usage: Mapped[list["ConsumerDailyUsage"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    meter_readings: Mapped[list["MeterReading"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    wallet: Mapped["Wallet"] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        uselist=False,
    )
    wallet_transactions: Mapped[list["WalletTransaction"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )


class ProsumerProfile(Base):
    __tablename__ = "prosumer_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(160), nullable=False)
    selected_export_plan: Mapped[str | None] = mapped_column(String(80), nullable=True)
    export_commitment_kwh: Mapped[int | None] = mapped_column(Integer, nullable=True)
    buyback_rate: Mapped[float] = mapped_column(Float, default=0.33, nullable=False)
    cashout_balance: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    device_id: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)

    user: Mapped[User] = relationship(back_populates="prosumer_profile")


class ConsumerProfile(Base):
    __tablename__ = "consumer_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)
    business_name: Mapped[str] = mapped_column(String(160), nullable=False)
    business_type: Mapped[str] = mapped_column(String(120), nullable=False)
    selected_package: Mapped[str | None] = mapped_column(String(80), nullable=True)
    package_allocation_kwh: Mapped[int | None] = mapped_column(Integer, nullable=True)

    user: Mapped[User] = relationship(back_populates="consumer_profile")


class ProsumerExportRecord(Base):
    __tablename__ = "prosumer_export_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    month: Mapped[str] = mapped_column(String(40), nullable=False)
    actual_exported_kwh: Mapped[float] = mapped_column(Float, nullable=False)
    solar_mate_kwh: Mapped[float] = mapped_column(Float, nullable=False)
    solar_atap_kwh: Mapped[float] = mapped_column(Float, nullable=False)
    solar_mate_earnings: Mapped[float] = mapped_column(Float, nullable=False)
    solar_atap_earnings: Mapped[float] = mapped_column(Float, nullable=False)
    total_earnings: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="Settled", nullable=False)

    user: Mapped[User] = relationship(back_populates="export_records")


class ProsumerDailyExport(Base):
    __tablename__ = "prosumer_daily_exports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    date: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    generated_kwh: Mapped[float] = mapped_column(Float, nullable=False)
    local_consumption_kwh: Mapped[float] = mapped_column(Float, nullable=False)
    exported_kwh: Mapped[float] = mapped_column(Float, nullable=False)

    user: Mapped[User] = relationship(back_populates="daily_exports")


class ConsumerDailyUsage(Base):
    __tablename__ = "consumer_daily_usage"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    date: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    total_usage_kwh: Mapped[float] = mapped_column(Float, nullable=False)
    green_credit_kwh: Mapped[float] = mapped_column(Float, nullable=False)
    tnb_import_kwh: Mapped[float] = mapped_column(Float, nullable=False)

    user: Mapped[User] = relationship(back_populates="daily_usage")


class MeterReading(Base):
    __tablename__ = "meter_readings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    device_id: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    voltage_v: Mapped[float] = mapped_column(Float, nullable=False)
    current_a: Mapped[float] = mapped_column(Float, nullable=False)
    power_w: Mapped[float] = mapped_column(Float, nullable=False)
    energy_wh: Mapped[float] = mapped_column(Float, nullable=False)
    scaled_energy_kwh: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    user: Mapped[User | None] = relationship(back_populates="meter_readings")


class PlatformMonthlySummary(Base):
    __tablename__ = "platform_monthly_summaries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    month_key: Mapped[str] = mapped_column(String(7), unique=True, nullable=False, index=True)
    month: Mapped[str] = mapped_column(String(40), nullable=False)
    total_users: Mapped[int] = mapped_column(Integer, nullable=False)
    total_prosumers: Mapped[int] = mapped_column(Integer, nullable=False)
    total_consumers: Mapped[int] = mapped_column(Integer, nullable=False)
    total_prosumer_supply_kwh: Mapped[float] = mapped_column(Float, nullable=False)
    total_consumer_demand_kwh: Mapped[float] = mapped_column(Float, nullable=False)
    matched_energy_kwh: Mapped[float] = mapped_column(Float, nullable=False)
    unmatched_supply_kwh: Mapped[float] = mapped_column(Float, nullable=False)
    unmatched_demand_kwh: Mapped[float] = mapped_column(Float, nullable=False)
    matching_rate: Mapped[float] = mapped_column(Float, nullable=False)
    solarmate_revenue: Mapped[float] = mapped_column(Float, nullable=False)
    consumer_savings: Mapped[float] = mapped_column(Float, nullable=False)
    prosumer_payout: Mapped[float] = mapped_column(Float, nullable=False)
    grid_toll: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="Settled", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class Wallet(Base):
    __tablename__ = "wallets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False, index=True)
    balance: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user: Mapped[User] = relationship(back_populates="wallet")


class WalletTransaction(Base):
    __tablename__ = "wallet_transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    transaction_type: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="successful", nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    user: Mapped[User] = relationship(back_populates="wallet_transactions")

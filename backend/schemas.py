from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

Role = Literal["prosumer", "consumer", "admin"]
PublicRole = Literal["prosumer", "consumer"]
Status = Literal["active", "disabled"]


class UserBase(BaseModel):
    id: int
    username: str
    email: str
    role: Role
    status: Status
    has_completed_onboarding: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=80)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    role: PublicRole
    display_name: str | None = None
    business_name: str | None = None
    business_type: str | None = None


class LoginRequest(BaseModel):
    username: str
    password: str


class AuthUser(BaseModel):
    id: int
    username: str
    email: str
    role: Role
    status: Status
    has_completed_onboarding: bool

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AuthUser


class RegisterResponse(BaseModel):
    user: AuthUser


class SelectProsumerPlanRequest(BaseModel):
    selected_export_plan: str
    export_commitment_kwh: Literal[100, 300, 500]


class ProsumerProfileResponse(BaseModel):
    username: str
    email: str
    display_name: str
    selected_export_plan: str | None
    export_commitment_kwh: int | None
    buyback_rate: float
    cashout_balance: float
    device_id: str | None = None
    has_completed_onboarding: bool


class ProsumerDailyExportResponse(BaseModel):
    date: str
    generated_kwh: float
    local_consumption_kwh: float
    exported_kwh: float


class ProsumerOverviewResponse(BaseModel):
    username: str
    display_name: str
    selected_export_plan: str | None
    export_commitment_kwh: int | None
    month: str
    generated_kwh: float
    local_consumption_kwh: float
    exported_kwh: float
    solar_mate_kwh: float
    solar_atap_kwh: float
    solar_mate_earnings: float
    solar_atap_earnings: float
    total_earnings: float
    current_day_of_month: int
    days_in_month: int
    month_progress_percentage: float
    quota_progress_percentage: float
    today_key: str
    last_updated_at: str


class ProsumerMonthlyExportResponse(BaseModel):
    month: str
    month_key: str
    generated_kwh: float
    local_consumption_kwh: float
    actual_exported_kwh: float
    solar_mate_kwh: float
    solar_atap_kwh: float
    solar_mate_earnings: float
    solar_atap_earnings: float
    total_earnings: float
    status: str


class ProsumerWalletResponse(BaseModel):
    username: str
    display_name: str
    selected_export_plan: str | None
    export_commitment_kwh: int | None
    month: str
    actual_exported_kwh: float
    solar_mate_kwh: float
    solar_atap_kwh: float
    solar_mate_earnings: float
    solar_atap_earnings: float
    total_earnings_this_month: float
    available_balance: float
    pending_settlement: float
    last_cashout_date: str
    cashout_status: str
    settlement_status: str
    uplift_percentage: float


class ProsumerStatementResponse(ProsumerWalletResponse):
    solar_mate_rate: float
    solar_atap_rate: float
    note: str


class MeterReadingRequest(BaseModel):
    device_id: str
    voltage_v: float = Field(ge=0)
    current_a: float = Field(ge=0)
    power_w: float | None = Field(default=None, ge=0)
    energy_wh: float = Field(ge=0)
    device_secret: str | None = None


class SimulateMeterReadingRequest(BaseModel):
    voltage_v: float = Field(default=8.2, ge=0)
    current_a: float = Field(default=0.12, ge=0)


class MeterReadingSavedResponse(BaseModel):
    status: str
    message: str
    device_id: str


class LatestMeterReadingResponse(BaseModel):
    device_id: str
    voltage_v: float
    current_a: float
    power_w: float
    energy_wh: float
    scaled_energy_kwh: float
    last_update: str | None
    status: str


class EspLatestResponse(BaseModel):
    device_id: str
    voltage_v: float
    current_a: float
    power_w: float
    energy_wh: float
    scaled_energy_kwh: float
    generated_kwh: float
    local_consumption_kwh: float
    daily_export_kwh: float
    monthly_export_kwh: float
    monthly_generation_kwh: float
    estimated_earnings_today: float
    device_status: str
    date_key: str
    date_label: str
    last_updated: str | None
    last_update: str | None


class MeterReadingPointResponse(BaseModel):
    time: str
    voltage_v: float
    current_a: float
    power_w: float
    energy_wh: float
    scaled_energy_kwh: float


class ProsumerEspLiveResponse(BaseModel):
    device_id: str
    display_name: str | None
    voltage_v: float
    current_a: float
    power_w: float
    energy_wh: float
    scaled_energy_kwh: float
    device_status: str
    last_update: str | None
    estimated_earnings_today: float
    scale_factor: float


class SelectConsumerPackageRequest(BaseModel):
    selected_package: str
    package_allocation_kwh: Literal[300, 1000, 2000]


class ConsumerProfileResponse(BaseModel):
    username: str
    email: str
    business_name: str
    business_type: str
    selected_package: str | None
    package_allocation_kwh: int | None
    has_completed_onboarding: bool


class ConsumerDailyUsageResponse(BaseModel):
    date: str
    total_usage_kwh: float
    green_credit_kwh: float
    tnb_import_kwh: float


class ConsumerOverviewResponse(BaseModel):
    username: str
    business_name: str
    business_type: str
    selected_package: str | None
    package_allocation_kwh: int | None
    month: str
    total_usage_kwh: float
    green_credit_kwh: float
    tnb_import_kwh: float
    total_bill: float
    savings: float
    actual_saving_percentage: float
    current_day_of_month: int
    days_in_month: int
    month_progress_percentage: float
    usage_progress_percentage: float
    today_key: str
    last_updated_at: str


class ConsumerBillingResponse(BaseModel):
    month: str
    total_usage_kwh: float
    green_credit_kwh: float
    tnb_import_kwh: float
    solar_mate_amount: float
    tnb_import_amount: float
    retail_charge: float
    total_bill: float
    tnb_only_bill: float
    savings: float
    actual_saving_percentage: float
    payment_status: str


class ConsumerMonthlyUsageResponse(BaseModel):
    month: str
    month_key: str
    total_usage_kwh: float
    green_credit_kwh: float
    tnb_import_kwh: float
    solar_mate_amount: float
    tnb_import_amount: float
    retail_charge: float
    total_bill: float
    tnb_only_bill: float
    savings: float
    actual_saving_percentage: float
    payment_status: str


class ConsumerLiveMeterResponse(BaseModel):
    current_load_power: float
    energy_used_today: float
    green_credit_used_today: float
    tnb_import_today: float
    smart_meter_status: str
    last_updated: str
    records: list[ConsumerDailyUsageResponse]


class ConsumerWalletResponse(BaseModel):
    username: str
    business_name: str
    business_type: str
    selected_package: str | None
    package_allocation_kwh: int | None
    month: str
    total_usage_kwh: float
    green_credit_kwh: float
    green_credit_remaining_kwh: float
    tnb_import_kwh: float
    utilisation_percentage: float
    total_bill: float
    savings: float
    actual_saving_percentage: float
    rate_discount_percentage: float
    payment_status: str
    usage_status: str


class ConsumerStatementResponse(ConsumerWalletResponse):
    solar_mate_rate: float
    tnb_peak_rate: float
    retail_charge: float
    note: str


class WalletResponse(BaseModel):
    username: str
    role: Role
    balance: float
    updated_at: datetime


class WalletTransactionResponse(BaseModel):
    id: int
    username: str | None = None
    role: Role | None = None
    transaction_type: str
    amount: float
    status: str
    description: str
    created_at: datetime


class WalletTopupRequest(BaseModel):
    amount: float = Field(gt=0)


class WalletCashoutRequest(BaseModel):
    amount: float | None = Field(default=None, gt=0)


class WalletActionResponse(BaseModel):
    message: str
    balance: float
    transaction: WalletTransactionResponse


class ConsumerPayBillResponse(BaseModel):
    message: str
    payment_status: str
    balance: float
    total_bill: float
    transaction: WalletTransactionResponse


class AdminUserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: Role
    status: Status
    has_completed_onboarding: bool
    selected_plan_package: str | None
    device_id: str | None = None
    device_status: str | None = None
    created_at: datetime


class AdminOverviewResponse(BaseModel):
    total_users: int
    total_prosumers: int
    total_consumers: int
    active_users: int
    disabled_users: int
    completed_onboarding_users: int
    pending_onboarding_users: int
    total_export_commitment: float
    matched_green_energy: float
    matching_rate: float
    total_consumer_demand: float
    unmatched_supply: float
    unmatched_demand: float
    tnb_imported_energy: float
    solar_mate_revenue: float
    prosumer_payout: float
    grid_toll: float
    consumer_rate_based_savings: float
    current_day_of_month: int
    days_in_month: int
    month_progress_percentage: float


class AdminMonthlyExportRecordResponse(BaseModel):
    month: str
    month_key: str
    prosumer_supply_kwh: float
    consumer_demand_kwh: float
    matched_energy_kwh: float
    unmatched_supply_kwh: float
    unmatched_demand_kwh: float
    sold_to_solarmate_kwh: float
    solar_atap_excess_kwh: float
    total_prosumer_payout: float
    solar_mate_revenue: float
    consumer_savings: float
    status: str


class GridIntelligenceWeatherHour(BaseModel):
    time: str
    weather_condition: str
    cloud_cover: float
    rain_probability: float
    rain_mm: float
    shortwave_radiation: float
    solar_factor: float
    forecasted_solar_supply_kwh: float
    forecasted_consumer_demand_kwh: float
    matched_energy_kwh: float
    expected_shortfall_kwh: float
    expected_surplus_kwh: float
    recommended_tnb_fallback_kwh: float
    solar_coverage_percent: float
    fallback_percent: float
    risk_level: str


class GridIntelligenceSummary(BaseModel):
    base_prosumer_supply_kwh: float
    forecasted_solar_supply_kwh: float
    forecasted_consumer_demand_kwh: float
    matched_energy_kwh: float
    expected_shortfall_kwh: float
    expected_surplus_kwh: float
    recommended_tnb_fallback_kwh: float
    solar_coverage_percent: float
    fallback_percent: float
    risk_level: str
    recommendation: str


class GridIntelligenceResponse(BaseModel):
    location: str
    timezone: str
    source: str
    generated_at: str
    current_hour: GridIntelligenceWeatherHour
    summary: GridIntelligenceSummary
    hourly_forecast: list[GridIntelligenceWeatherHour]


class MessageResponse(BaseModel):
    message: str

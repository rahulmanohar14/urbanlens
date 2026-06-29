import math

import numpy as np
import pandas as pd
import pytest

from app.services.prediction_service import STATS_AVAILABLE


def test_statsmodels_available_flag():
    assert STATS_AVAILABLE is True


@pytest.mark.skipif(not STATS_AVAILABLE, reason="statsmodels not installed")
def test_holt_winters_forecast_produces_finite_values():
    """Holt-Winters path used by PredictionService on an in-memory series."""
    from statsmodels.tsa.holtwinters import ExponentialSmoothing

    rng = np.random.default_rng(0)
    index = pd.date_range("2024-01-01", periods=90, freq="D")
    y = pd.Series(20 + rng.normal(0, 2, 90).cumsum(), index=index)

    model = ExponentialSmoothing(
        y,
        trend="add",
        damped_trend=True,
        seasonal=None,
        initialization_method="estimated",
    ).fit(optimized=True)
    forecast = model.forecast(7)

    assert len(forecast) == 7
    assert np.all(np.isfinite(forecast))


def _haversine_meters(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance in meters (same geometry GeoService queries via ST_Distance)."""
    radius = 6_371_000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return 2 * radius * math.asin(math.sqrt(a))


def test_haversine_distance_within_expected_radius():
    """Boston Common to a point ~1 km north — within typical GeoService search radius."""
    boston_common = (42.3551, -71.0657)
    north_point = (42.3641, -71.0657)
    distance = _haversine_meters(*boston_common, *north_point)
    assert 900 < distance < 1100


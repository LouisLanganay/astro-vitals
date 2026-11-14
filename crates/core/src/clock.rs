use std::fmt;

use crate::model::MissionDay;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ClockError {
    pub input: String,
    pub message: String,
}

impl fmt::Display for ClockError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "invalid date `{}`: {}", self.input, self.message)
    }
}

impl std::error::Error for ClockError {}

fn clock_error(input: &str, message: &str) -> ClockError {
    ClockError {
        input: input.to_string(),
        message: message.to_string(),
    }
}

pub fn is_leap_year(year: i64) -> bool {
    (year.rem_euclid(4) == 0 && year.rem_euclid(100) != 0) || year.rem_euclid(400) == 0
}

pub fn days_in_month(year: i64, month: u32) -> u32 {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 if is_leap_year(year) => 29,
        2 => 28,
        _ => 0,
    }
}

fn digits(bytes: &[u8]) -> Option<u32> {
    let mut value: u32 = 0;
    for &b in bytes {
        if !b.is_ascii_digit() {
            return None;
        }
        value = value * 10 + u32::from(b - b'0');
    }
    Some(value)
}

pub fn parse_date(date: &str) -> Result<(i64, u32, u32), ClockError> {
    let bytes = date.as_bytes();
    if bytes.len() != 10 || bytes[4] != b'-' || bytes[7] != b'-' {
        return Err(clock_error(date, "use the format YYYY-MM-DD"));
    }
    let (year, month, day) = match (
        digits(&bytes[0..4]),
        digits(&bytes[5..7]),
        digits(&bytes[8..10]),
    ) {
        (Some(year), Some(month), Some(day)) => (i64::from(year), month, day),
        _ => return Err(clock_error(date, "use digits for year, month and day")),
    };
    if !(1..=12).contains(&month) {
        return Err(clock_error(date, "the month must be 01 to 12"));
    }
    if !(1..=days_in_month(year, month)).contains(&day) {
        return Err(clock_error(date, "the day is not in the month"));
    }
    Ok((year, month, day))
}

pub fn days_from_civil(year: i64, month: u32, day: u32) -> i64 {
    let m = i64::from(month);
    let d = i64::from(day);
    let y = if m <= 2 { year - 1 } else { year };
    let era = y.div_euclid(400);
    let yoe = y - era * 400;
    let mp = (m + 9).rem_euclid(12);
    let doy = (153 * mp + 2) / 5 + d - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146_097 + doe - 719_468
}

pub fn civil_from_days(days: i64) -> (i64, u32, u32) {
    let z = days + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = doy - (153 * mp + 2) / 5 + 1;
    let month = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = yoe + era * 400 + i64::from(month <= 2);
    (year, month as u32, day as u32)
}

pub fn mission_day(date: &str, launch: &str) -> Result<MissionDay, ClockError> {
    let (year, month, day) = parse_date(date)?;
    let (launch_year, launch_month, launch_day) = parse_date(launch)?;
    let diff = days_from_civil(year, month, day)
        - days_from_civil(launch_year, launch_month, launch_day);
    MissionDay::try_from(diff)
        .map_err(|_| clock_error(date, "the date is too far from launch"))
}

pub fn date_for_day(launch: &str, day: MissionDay) -> Result<String, ClockError> {
    let (year, month, dom) = parse_date(launch)?;
    let days = days_from_civil(year, month, dom) + i64::from(day);
    let (y, m, d) = civil_from_days(days);
    Ok(format!("{y:04}-{m:02}-{d:02}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn known_day_numbers() {
        assert_eq!(days_from_civil(1970, 1, 1), 0);
        assert_eq!(days_from_civil(2000, 3, 1), 11_017);
        assert_eq!(days_from_civil(1969, 12, 31), -1);
        assert_eq!(civil_from_days(0), (1970, 1, 1));
        assert_eq!(civil_from_days(11_017), (2000, 3, 1));
    }

    #[test]
    fn mission_day_from_launch() {
        assert_eq!(mission_day("2027-01-01", "2027-01-01"), Ok(0));
        assert_eq!(mission_day("2026-12-31", "2027-01-01"), Ok(-1));
        assert_eq!(mission_day("2026-12-18", "2027-01-01"), Ok(-14));
        assert_eq!(mission_day("2027-03-01", "2027-01-01"), Ok(59));
        assert_eq!(mission_day("2028-03-01", "2028-02-28"), Ok(2));
    }

    #[test]
    fn rejects_bad_dates() {
        let launch = "2027-01-01";
        for bad in [
            "2027-02-29",
            "2027-13-01",
            "2027-00-10",
            "2027-04-31",
            "2027-1-01",
            "2027/01/01",
            "abcd-01-01",
            "+027-01-01",
            "",
        ] {
            assert!(mission_day(bad, launch).is_err(), "{bad}");
            assert!(mission_day(launch, bad).is_err(), "{bad}");
        }
        assert!(parse_date("2028-02-29").is_ok());
        assert!(parse_date("2000-02-29").is_ok());
        assert!(parse_date("1900-02-29").is_err());
    }

    #[test]
    fn date_round_trip() {
        let launch = "2027-01-01";
        assert_eq!(date_for_day(launch, -1), Ok("2026-12-31".to_string()));
        for day in -800..800 {
            let date = date_for_day(launch, day).unwrap_or_default();
            assert_eq!(mission_day(&date, launch), Ok(day));
        }
    }

    #[test]
    fn error_names_input() {
        let error = mission_day("2027-02-30", "2027-01-01").unwrap_err();
        assert!(error.to_string().contains("2027-02-30"));
    }
}

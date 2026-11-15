use astro_vitals_core::model::{
    BASELINE_DAYS, Calibration, DailyCheck, EyeResult, PvtInput, PvtTrial, ScenarioId, VisionResult,
};
use astro_vitals_core::scenario::{self, DEFAULT_SEED};
use astro_vitals_core::validate;
use chrono::{Days, NaiveDate};

fn launch() -> NaiveDate {
    NaiveDate::from_ymd_opt(2027, 1, 1).unwrap()
}

fn today() -> NaiveDate {
    NaiveDate::from_ymd_opt(2027, 5, 1).unwrap()
}

fn first() -> NaiveDate {
    launch() - Days::new(BASELINE_DAYS.into())
}

fn fields(result: Result<(), astro_vitals_core::model::ValidationError>) -> Vec<String> {
    result
        .err()
        .map(|e| e.errors.into_iter().map(|f| f.field).collect())
        .unwrap_or_default()
}

fn pvt(date: NaiveDate) -> PvtInput {
    PvtInput {
        date,
        trials: vec![PvtTrial::Response { rt_ms: 250.0 }],
    }
}

fn vision(date: NaiveDate) -> VisionResult {
    let eye = EyeResult {
        acuity_logmar: 0.0,
        amsler_distortion: false,
        amsler_cells: Vec::new(),
    };
    VisionResult {
        date,
        left: eye.clone(),
        right: eye,
    }
}

#[test]
fn a_date_before_the_first_baseline_day_is_rejected() {
    let calibration = Calibration { px_per_mm: 4.0 };
    let too_old = first().pred_opt().unwrap();
    let year_two = NaiveDate::from_ymd_opt(2, 1, 1).unwrap();
    for date in [too_old, year_two] {
        assert_eq!(
            fields(validate::daily_check(
                &DailyCheck::empty(date),
                launch(),
                today()
            )),
            ["date"]
        );
        assert_eq!(
            fields(validate::pvt_input(&pvt(date), launch(), today())),
            ["date"]
        );
        assert_eq!(
            fields(validate::vision_result(
                &vision(date),
                Some(&calibration),
                launch(),
                today()
            )),
            ["date"]
        );
    }
    let error = validate::daily_check(&DailyCheck::empty(too_old), launch(), today()).unwrap_err();
    assert_eq!(error.to_string(), "date: must not be before 2026-12-18");
}

#[test]
fn the_first_baseline_day_is_accepted() {
    let calibration = Calibration { px_per_mm: 4.0 };
    assert_eq!(
        validate::daily_check(&DailyCheck::empty(first()), launch(), today()),
        Ok(())
    );
    assert_eq!(
        validate::pvt_input(&pvt(first()), launch(), today()),
        Ok(())
    );
    assert_eq!(
        validate::vision_result(&vision(first()), Some(&calibration), launch(), today()),
        Ok(())
    );
}

#[test]
fn today_is_accepted_when_the_launch_is_far_away() {
    let launch = today() + Days::new(90);
    assert_eq!(
        validate::daily_check(&DailyCheck::empty(today()), launch, today()),
        Ok(())
    );
    assert_eq!(
        fields(validate::daily_check(
            &DailyCheck::empty(today().pred_opt().unwrap()),
            launch,
            today()
        )),
        ["date"]
    );
}

#[test]
fn each_scenario_date_passes_the_date_check() {
    for id in ScenarioId::ALL {
        let doc = scenario::generate(id, DEFAULT_SEED, today());
        let launch = doc.settings.launch_date;
        for check in doc.checks.values() {
            assert_eq!(validate::daily_check(check, launch, today()), Ok(()));
        }
        for date in doc.pvt.keys() {
            assert_eq!(validate::pvt_input(&pvt(*date), launch, today()), Ok(()));
        }
        let calibration = Calibration { px_per_mm: 4.0 };
        for result in doc.vision.values() {
            assert_eq!(
                validate::vision_result(result, Some(&calibration), launch, today()),
                Ok(())
            );
        }
    }
}

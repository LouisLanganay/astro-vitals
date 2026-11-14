use astro_vitals_core::rules::{self, catalog};
use serde_json::json;

const RULES_TOML: &str = include_str!("../../../rules/rules.toml");

fn file_ids() -> Vec<String> {
    RULES_TOML
        .lines()
        .filter_map(|line| line.strip_prefix("id = \""))
        .filter_map(|rest| rest.strip_suffix('"'))
        .map(str::to_owned)
        .collect()
}

#[test]
fn catalog_has_all_rules_in_file_order() {
    let set = rules::parse(RULES_TOML).unwrap();
    let catalog = catalog(&set);
    assert_eq!(catalog.rules.len(), 31);
    let ids: Vec<String> = catalog.rules.iter().map(|r| r.id.clone()).collect();
    assert_eq!(ids, file_ids());
    assert_eq!(catalog.drift, set.drift);
}

#[test]
fn catalog_json_uses_snake_case_names() {
    let catalog = catalog(&rules::parse(RULES_TOML).unwrap());
    let value = serde_json::to_value(&catalog).unwrap();
    assert_eq!(value["drift"], json!({ "self_care": 2.0, "tell_cmo": 3.0 }));
    let find = |id: &str| {
        value["rules"]
            .as_array()
            .unwrap()
            .iter()
            .find(|r| r["id"] == id)
            .unwrap()
            .clone()
    };
    assert_eq!(
        find("sleep_3d_below_5h"),
        json!({
            "id": "sleep_3d_below_5h",
            "indicator": "sleep_hours",
            "kind": "absolute",
            "level": "tell_cmo",
            "threshold": 5.0,
            "window_days": 3,
            "min_days": 2,
            "sustain_days": null,
            "body_region": "head",
            "action": "Tell the Crew Medical Officer. Avoid critical tasks until you sleep more.",
            "explanation": "Your mean sleep for 3 days is below 5 hours. Sleep below 5 hours increases exhaustion.",
            "source": "https://doi.org/10.1093/sleep/zsac006",
        })
    );
    let chest = find("red_flag_chest_pain");
    assert_eq!(chest["kind"], "red_flag");
    assert_eq!(chest["level"], "flight_surgeon");
    assert_eq!(chest["body_region"], "chest");
    assert_eq!(chest["threshold"], json!(null));
    let drift = find("pvt_lapses_drift_self_care");
    assert_eq!(drift["kind"], "drift");
    assert_eq!(drift["level"], "self_care");
    assert_eq!(drift["threshold"], json!(null));
    assert_eq!(
        find("exercise_7d_below_prescription")["threshold"],
        json!(null)
    );
}

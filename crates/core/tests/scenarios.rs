use astro_vitals_core::model::ScenarioId;

const RULES_TOML: &str = include_str!("../../../rules/rules.toml");

#[test]
fn inputs_are_available() {
    let _ = (RULES_TOML, ScenarioId::ALL);
}

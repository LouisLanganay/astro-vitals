use astro_core::{evaluate, parse_rules, MissionData, RuleSet, Settings};

fn load() -> RuleSet {
    let path = concat!(env!("CARGO_MANIFEST_DIR"), "/../../rules/rules.toml");
    let src = std::fs::read_to_string(path).expect("rules/rules.toml is readable");
    match parse_rules(&src) {
        Ok(set) => set,
        Err(err) => panic!("rules/rules.toml is invalid: {err}"),
    }
}

#[test]
fn rules_file_parses() {
    assert!(!load().rules.is_empty());
}

#[test]
fn each_rule_has_source_action_and_explanation() {
    for rule in load().rules {
        assert!(rule.source.starts_with("http"), "{}: source", rule.id);
        assert!(!rule.action.trim().is_empty(), "{}: action", rule.id);
        assert!(
            !rule.explanation.trim().is_empty(),
            "{}: explanation",
            rule.id
        );
    }
}

#[test]
fn empty_data_gives_ok() {
    let rules = load();
    let assessment = evaluate(0, &MissionData::default(), &rules, &Settings::default());
    assert!(assessment.fired.is_empty());
}

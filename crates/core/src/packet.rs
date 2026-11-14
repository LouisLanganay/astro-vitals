use chrono::NaiveDate;

use crate::model::{Document, Packet};
use crate::rules::RuleSet;

pub const MAX_BYTES: usize = 16 * 1024;
pub const WINDOW_DAYS: u32 = 14;

pub fn build(doc: &Document, rules: &RuleSet, today: NaiveDate) -> Packet {
    let _ = (doc, rules, today);
    todo!()
}

pub fn to_json(packet: &Packet) -> String {
    let _ = packet;
    todo!()
}

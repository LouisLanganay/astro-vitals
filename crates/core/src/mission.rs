use chrono::NaiveDate;

use crate::model::{
    DailyCheck, DayView, Document, DueTask, MissionStatus, Notice, TaskKind, VISION_INTERVAL_DAYS,
};

pub fn mission_day(launch_date: NaiveDate, date: NaiveDate) -> i32 {
    (date - launch_date).num_days() as i32
}

fn complete(doc: &Document, date: NaiveDate) -> bool {
    doc.checks.get(&date).is_some_and(DailyCheck::is_complete)
}

pub fn streak(doc: &Document, today: NaiveDate) -> u32 {
    let start = if complete(doc, today) {
        Some(today)
    } else {
        today.pred_opt()
    };
    let mut count = 0;
    let mut day = start;
    while let Some(d) = day.filter(|d| complete(doc, *d)) {
        count += 1;
        day = d.pred_opt();
    }
    count
}

pub fn due_tasks(doc: &Document, today: NaiveDate) -> Vec<DueTask> {
    let mut due = Vec::new();
    if !complete(doc, today) {
        due.push(DueTask {
            kind: TaskKind::DailyCheck,
            optional: false,
        });
    }
    if !doc.pvt.contains_key(&today) {
        due.push(DueTask {
            kind: TaskKind::Pvt,
            optional: true,
        });
    }
    let last_vision = doc.vision.range(..=today).next_back();
    if last_vision.is_none_or(|(d, _)| (today - *d).num_days() >= i64::from(VISION_INTERVAL_DAYS)) {
        due.push(DueTask {
            kind: TaskKind::VisionTest,
            optional: false,
        });
    }
    due
}

pub fn status(doc: &Document, today: NaiveDate, notices: Vec<Notice>) -> MissionStatus {
    MissionStatus {
        today,
        mission_day: mission_day(doc.settings.launch_date, today),
        due: due_tasks(doc, today),
        streak: streak(doc, today),
        notices,
    }
}

pub fn day_view(
    doc: &Document,
    date: NaiveDate,
    today: NaiveDate,
    notices: Vec<Notice>,
) -> DayView {
    DayView {
        date,
        mission_day: mission_day(doc.settings.launch_date, date),
        check: doc
            .checks
            .get(&date)
            .cloned()
            .unwrap_or_else(|| DailyCheck::empty(date)),
        pvt: doc.pvt.get(&date).cloned(),
        vision: doc.vision.get(&date).cloned(),
        mission: status(doc, today, notices),
    }
}

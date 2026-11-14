use chrono::NaiveDate;

use crate::model::{DayView, Document, DueTask, MissionStatus, Notice};

pub fn mission_day(launch_date: NaiveDate, date: NaiveDate) -> i32 {
    let _ = (launch_date, date);
    todo!()
}

pub fn streak(doc: &Document, today: NaiveDate) -> u32 {
    let _ = (doc, today);
    todo!()
}

pub fn due_tasks(doc: &Document, today: NaiveDate) -> Vec<DueTask> {
    let _ = (doc, today);
    todo!()
}

pub fn status(doc: &Document, today: NaiveDate, notices: Vec<Notice>) -> MissionStatus {
    let _ = (doc, today, notices);
    todo!()
}

pub fn day_view(
    doc: &Document,
    date: NaiveDate,
    today: NaiveDate,
    notices: Vec<Notice>,
) -> DayView {
    let _ = (doc, date, today, notices);
    todo!()
}

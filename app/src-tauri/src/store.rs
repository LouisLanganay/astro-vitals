use std::io;
use std::path::{Path, PathBuf};

use astro_vitals_core::model::Document;
use chrono::NaiveDate;

pub const DATA_FILE: &str = "data.json";

pub struct Store {
    path: PathBuf,
    doc: Document,
    corrupt_backup: Option<PathBuf>,
}

impl Store {
    pub fn open(dir: &Path, today: NaiveDate) -> io::Result<Store> {
        Ok(Store {
            path: dir.join(DATA_FILE),
            doc: Document::new(today),
            corrupt_backup: None,
        })
    }

    pub fn doc(&self) -> &Document {
        &self.doc
    }

    pub fn replace(&mut self, doc: Document) -> io::Result<()> {
        let _ = (&self.path, doc);
        todo!()
    }

    pub fn corrupt_backup(&self) -> Option<&Path> {
        self.corrupt_backup.as_deref()
    }
}

pub fn write_atomic(path: &Path, bytes: &[u8]) -> io::Result<()> {
    let _ = (path, bytes);
    todo!()
}

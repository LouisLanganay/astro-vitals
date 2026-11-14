use std::fs::{self, File};
use std::io::{self, Write};
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
        fs::create_dir_all(dir)?;
        let path = dir.join(DATA_FILE);
        let mut corrupt_backup = None;
        let doc = match fs::read(&path) {
            Ok(bytes) => match serde_json::from_slice(&bytes) {
                Ok(doc) => doc,
                Err(_) => {
                    let backup = (1u32..)
                        .map(|n| dir.join(format!("data.corrupt-{n}.json")))
                        .find(|p| !p.exists())
                        .ok_or(io::ErrorKind::AlreadyExists)?;
                    fs::rename(&path, &backup)?;
                    corrupt_backup = Some(backup);
                    Document::new(today)
                }
            },
            Err(e) if e.kind() == io::ErrorKind::NotFound => Document::new(today),
            Err(e) => return Err(e),
        };
        Ok(Store {
            path,
            doc,
            corrupt_backup,
        })
    }

    pub fn doc(&self) -> &Document {
        &self.doc
    }

    pub fn replace(&mut self, doc: Document) -> io::Result<()> {
        write_atomic(&self.path, &serde_json::to_vec(&doc)?)?;
        self.doc = doc;
        Ok(())
    }

    pub fn corrupt_backup(&self) -> Option<&Path> {
        self.corrupt_backup.as_deref()
    }
}

pub fn write_atomic(path: &Path, bytes: &[u8]) -> io::Result<()> {
    let mut name = path
        .file_name()
        .ok_or(io::ErrorKind::InvalidInput)?
        .to_os_string();
    name.push(format!(".{}.tmp", std::process::id()));
    let tmp = path.with_file_name(name);
    let result = File::create(&tmp).and_then(|mut file| {
        file.write_all(bytes)?;
        file.sync_all()?;
        fs::rename(&tmp, path)
    });
    if result.is_err() {
        let _ = fs::remove_file(&tmp);
    }
    result
}

#[cfg(test)]
pub mod tests {
    use super::*;
    use astro_vitals_core::model::DailyCheck;

    pub fn temp_dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("astro-vitals-{}-{name}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    pub fn names(dir: &Path) -> Vec<String> {
        let mut names: Vec<String> = fs::read_dir(dir)
            .unwrap()
            .map(|e| e.unwrap().file_name().into_string().unwrap())
            .collect();
        names.sort();
        names
    }

    fn day(s: &str) -> NaiveDate {
        s.parse().unwrap()
    }

    #[test]
    fn save_and_load_cycle() {
        let dir = temp_dir("cycle").join("nested");
        let today = day("2026-11-14");
        let mut store = Store::open(&dir, today).unwrap();
        assert_eq!(store.doc(), &Document::new(today));
        assert!(store.corrupt_backup().is_none());
        assert!(names(&dir).is_empty());

        let mut doc = store.doc().clone();
        doc.checks.insert(today, DailyCheck::empty(today));
        store.replace(doc.clone()).unwrap();
        assert_eq!(store.doc(), &doc);
        assert_eq!(names(&dir), [DATA_FILE]);

        let store = Store::open(&dir, day("2026-12-01")).unwrap();
        assert_eq!(store.doc(), &doc);
        assert!(store.corrupt_backup().is_none());
        fs::remove_dir_all(dir.parent().unwrap()).unwrap();
    }

    #[test]
    fn write_error_leaves_no_partial_file() {
        let dir = temp_dir("atomic");
        let file = dir.join("out.json");
        write_atomic(&file, b"first").unwrap();
        write_atomic(&file, b"second").unwrap();
        assert_eq!(fs::read(&file).unwrap(), b"second");
        assert_eq!(names(&dir), ["out.json"]);

        let blocked = dir.join("blocked");
        fs::create_dir(&blocked).unwrap();
        fs::write(blocked.join("keep"), b"keep").unwrap();
        assert!(write_atomic(&blocked, b"data").is_err());
        assert!(write_atomic(&dir.join("missing").join("out.json"), b"data").is_err());
        assert_eq!(names(&dir), ["blocked", "out.json"]);
        assert_eq!(names(&blocked), ["keep"]);
        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn save_error_keeps_the_document() {
        let dir = temp_dir("save-error");
        let today = day("2026-11-14");
        let mut store = Store::open(&dir, today).unwrap();
        fs::remove_dir_all(&dir).unwrap();
        let mut doc = store.doc().clone();
        doc.checks.insert(today, DailyCheck::empty(today));
        assert!(store.replace(doc).is_err());
        assert_eq!(store.doc(), &Document::new(today));
        assert!(!dir.exists());
    }

    #[test]
    fn corrupt_file_is_kept_and_renamed() {
        let dir = temp_dir("corrupt");
        let today = day("2026-11-14");
        let file = dir.join(DATA_FILE);

        fs::write(&file, b"{\"version\":1,").unwrap();
        let mut store = Store::open(&dir, today).unwrap();
        let first = store.corrupt_backup().unwrap().to_path_buf();
        assert_eq!(store.doc(), &Document::new(today));
        assert_eq!(fs::read(&first).unwrap(), b"{\"version\":1,");
        assert!(!file.exists());

        store.replace(Document::new(today)).unwrap();
        assert!(Store::open(&dir, today).unwrap().corrupt_backup().is_none());

        fs::write(&file, b"").unwrap();
        let store = Store::open(&dir, today).unwrap();
        let second = store.corrupt_backup().unwrap().to_path_buf();
        assert_ne!(first, second);
        assert_eq!(fs::read(&first).unwrap(), b"{\"version\":1,");
        assert_eq!(fs::read(&second).unwrap(), b"");
        assert_eq!(names(&dir).len(), 2);
        fs::remove_dir_all(&dir).unwrap();
    }
}

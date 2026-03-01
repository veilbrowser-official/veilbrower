use sqlx::{sqlite::{SqlitePoolOptions, SqliteConnectOptions}, SqlitePool};
use std::path::PathBuf;
use std::str::FromStr;

#[derive(Clone)]
pub struct DbPool {
    pub pool: SqlitePool,
}

impl DbPool {
    /// Initializes the SQLite connection pool and runs migrations.
    pub async fn init(app_data_dir: PathBuf) -> Result<Self, sqlx::Error> {
        let db_path = app_data_dir.join("veilbrowser.db");
        
        let db_url = format!("sqlite://{}", db_path.to_str().unwrap());
        
        // Ensure the directory exists
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| sqlx::Error::Io(e))?;
        }

        // Create the pool with automatic file creation
        let connection_options = SqliteConnectOptions::from_str(&db_url)?
            .create_if_missing(true);

        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect_with(connection_options)
            .await?;

        // Run embedded migrations from the `migrations/` directory
        sqlx::migrate!("./migrations")
            .run(&pool)
            .await?;

        println!("✅ SQLite Database initialized and migrated at: {:?}", db_path);

        Ok(Self { pool })
    }
}

#[tokio::main]
async fn main() {
    let client = reqwest::Client::new();
    let res = client.get("https://api.poe.com/v1/models").send().await.unwrap();
    let json: serde_json::Value = res.json().await.unwrap();
    let mut models = vec![];
    if let Some(data) = json.get("data").and_then(|d| d.as_array()) {
        for item in data {
            if let Some(id) = item.get("id").and_then(|i| i.as_str()) {
                models.push(id.to_string());
            }
        }
    }
    println!("Found {} models: {:?}", models.len(), models);
}

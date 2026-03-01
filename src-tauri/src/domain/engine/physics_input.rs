use rand::Rng;

#[derive(Debug, Clone, Copy)]
pub struct Point {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone)]
pub struct MouseFrame {
    pub point: Point,
    pub delay_ms: u64,
}

pub struct PhysicsInput;

impl PhysicsInput {
    /// 模拟人类键盘敲击延迟 (70ms - 150ms 波动)
    pub fn generate_typing_delays(text: &str) -> Vec<u64> {
        let mut rng = rand::thread_rng();
        let mut delays = Vec::with_capacity(text.len());
        for _ in 0..text.len() {
            let delay = rng.gen_range(70..150);
            delays.push(delay);
        }
        delays
    }

    /// 模拟人类鼠标移动轨迹 (基于贝塞尔曲线与 Fitts's Law 费茨法则速度近似)
    pub fn generate_mouse_trajectory(start: Point, end: Point, steps: usize) -> Vec<MouseFrame> {
        let mut rng = rand::thread_rng();
        let mut frames = Vec::with_capacity(steps);
        
        if steps == 0 {
            return vec![MouseFrame { point: end, delay_ms: 10 }];
        }
        
        // 随机控制点偏移，模拟人手位移的弧度
        let offset_x1 = rng.gen_range(-50.0..50.0);
        let offset_y1 = rng.gen_range(-50.0..50.0);
        let offset_x2 = rng.gen_range(-50.0..50.0);
        let offset_y2 = rng.gen_range(-50.0..50.0);
        
        // 三次方贝塞尔曲线控制点
        let ctrl1 = Point {
            x: start.x + (end.x - start.x) * 0.3 + offset_x1,
            y: start.y + (end.y - start.y) * 0.3 + offset_y1,
        };
        let ctrl2 = Point {
            x: start.x + (end.x - start.x) * 0.7 + offset_x2,
            y: start.y + (end.y - start.y) * 0.7 + offset_y2,
        };

        for i in 1..=steps {
            let t = i as f64 / steps as f64;
            let u = 1.0 - t;
            let u2 = u * u;
            let u3 = u2 * u;
            let t2 = t * t;
            let t3 = t2 * t;

            // 计算该 t 时刻坐标
            let bx = u3 * start.x + 3.0 * u2 * t * ctrl1.x + 3.0 * u * t2 * ctrl2.x + t3 * end.x;
            let by = u3 * start.y + 3.0 * u2 * t * ctrl1.y + 3.0 * u * t2 * ctrl2.y + t3 * end.y;
            
            // Fitts's Law 速度近似模型 (Minimum Jerk / 钟形速度)
            // 两头慢，中间快 -> 所以两头同一帧的 delay 停留时间要更久
            let base_delay = rng.gen_range(5..15); // 基础帧间隙 5~15ms
            let distance_from_center = (t - 0.5).abs(); // 0 to 0.5
            let delay_multiplier = 1.0 + distance_from_center * 3.0; // 越靠近两端 (0 或者 1)，倍率越大，最慢达到 2.5倍
            
            let delay_ms = (base_delay as f64 * delay_multiplier) as u64;
            
            frames.push(MouseFrame {
                point: Point { x: bx, y: by },
                delay_ms,
            });
        }
        
        frames
    }
}

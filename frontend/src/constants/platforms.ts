/**
 * 预置平台列表（参考 AdsPower 2025）
 * 包含常用社交媒体、电商、邮箱等平台
 */

export interface Platform {
  id: string;              // 平台标识（如 'twitter', 'facebook'）
  name: string;            // 平台名称（如 'Twitter/X', 'Facebook'）
  icon?: string;          // 平台图标（emoji 或图标名称）
  defaultUrl: string;     // 默认启动 URL
  category: 'social' | 'ecommerce' | 'email' | 'payment' | 'other'; // 平台分类
}

/**
 * 平台图标映射（使用 emoji 和图标）
 */
const PLATFORM_ICONS: Record<string, string> = {
  // 社交媒体
  twitter: '🐦',
  facebook: '📘',
  instagram: '📷',
  tiktok: '🎵',
  linkedin: '💼',
  youtube: '📺',
  pinterest: '📌',
  reddit: '🤖',
  discord: '💬',
  telegram: '✈️',
  snapchat: '👻',
  
  // 电商平台
  amazon: '📦',
  ebay: '🏷️',
  aliexpress: '🛒',
  shopee: '🛍️',
  lazada: '🛒',
  etsy: '🎨',
  wish: '⭐',
  
  // 邮箱平台
  gmail: '📧',
  'yahoo-mail': '📬',
  outlook: '📮',
  protonmail: '🔒',
  
  // 支付平台
  paypal: '💳',
  stripe: '💵',
  
  // 中国社交媒体
  wechat: '💬',
  weibo: '📱',
  douyin: '🎬',
  xiaohongshu: '📖',
  kuaishou: '⚡',
  bilibili: '📺',
  qq: '🐧',
  zhihu: '💡',
  
  // 中国电商平台
  taobao: '🛍️',
  tmall: '🏪',
  jd: '📦',
  pinduoduo: '💰',
  
  // 中国支付平台
  alipay: '💳',
  
  // 其他平台
  github: '🐙',
  google: '🔍',
  microsoft: '🪟',
  apple: '🍎',
};

/**
 * 预置平台列表
 */
export const PLATFORMS: Platform[] = [
  // ========== 社交媒体 ==========
  {
    id: 'twitter',
    name: 'Twitter/X',
    icon: PLATFORM_ICONS.twitter,
    defaultUrl: 'https://twitter.com/home',
    category: 'social',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: PLATFORM_ICONS.facebook,
    defaultUrl: 'https://www.facebook.com',
    category: 'social',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: PLATFORM_ICONS.instagram,
    defaultUrl: 'https://www.instagram.com',
    category: 'social',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: PLATFORM_ICONS.tiktok,
    defaultUrl: 'https://www.tiktok.com',
    category: 'social',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: PLATFORM_ICONS.linkedin,
    defaultUrl: 'https://www.linkedin.com/feed',
    category: 'social',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: PLATFORM_ICONS.youtube,
    defaultUrl: 'https://www.youtube.com',
    category: 'social',
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    icon: PLATFORM_ICONS.pinterest,
    defaultUrl: 'https://www.pinterest.com',
    category: 'social',
  },
  {
    id: 'reddit',
    name: 'Reddit',
    icon: PLATFORM_ICONS.reddit,
    defaultUrl: 'https://www.reddit.com',
    category: 'social',
  },
  {
    id: 'discord',
    name: 'Discord',
    icon: PLATFORM_ICONS.discord,
    defaultUrl: 'https://discord.com',
    category: 'social',
  },
  {
    id: 'telegram',
    name: 'Telegram',
    icon: PLATFORM_ICONS.telegram,
    defaultUrl: 'https://web.telegram.org',
    category: 'social',
  },
  {
    id: 'snapchat',
    name: 'Snapchat',
    icon: PLATFORM_ICONS.snapchat,
    defaultUrl: 'https://www.snapchat.com',
    category: 'social',
  },
  
  // ========== 中国社交媒体 ==========
  {
    id: 'wechat',
    name: '微信',
    icon: PLATFORM_ICONS.wechat,
    defaultUrl: 'https://wx.qq.com',
    category: 'social',
  },
  {
    id: 'weibo',
    name: '微博',
    icon: PLATFORM_ICONS.weibo,
    defaultUrl: 'https://weibo.com',
    category: 'social',
  },
  {
    id: 'douyin',
    name: '抖音',
    icon: PLATFORM_ICONS.douyin,
    defaultUrl: 'https://www.douyin.com',
    category: 'social',
  },
  {
    id: 'xiaohongshu',
    name: '小红书',
    icon: PLATFORM_ICONS.xiaohongshu,
    defaultUrl: 'https://www.xiaohongshu.com',
    category: 'social',
  },
  {
    id: 'kuaishou',
    name: '快手',
    icon: PLATFORM_ICONS.kuaishou,
    defaultUrl: 'https://www.kuaishou.com',
    category: 'social',
  },
  {
    id: 'bilibili',
    name: 'B站',
    icon: PLATFORM_ICONS.bilibili,
    defaultUrl: 'https://www.bilibili.com',
    category: 'social',
  },
  {
    id: 'zhihu',
    name: '知乎',
    icon: PLATFORM_ICONS.zhihu,
    defaultUrl: 'https://www.zhihu.com',
    category: 'social',
  },
  {
    id: 'qq',
    name: 'QQ',
    icon: PLATFORM_ICONS.qq,
    defaultUrl: 'https://im.qq.com',
    category: 'social',
  },
  
  // ========== 电商平台 ==========
  {
    id: 'amazon',
    name: 'Amazon',
    icon: PLATFORM_ICONS.amazon,
    defaultUrl: 'https://www.amazon.com',
    category: 'ecommerce',
  },
  {
    id: 'ebay',
    name: 'eBay',
    icon: PLATFORM_ICONS.ebay,
    defaultUrl: 'https://www.ebay.com',
    category: 'ecommerce',
  },
  {
    id: 'aliexpress',
    name: 'AliExpress',
    icon: PLATFORM_ICONS.aliexpress,
    defaultUrl: 'https://www.aliexpress.com',
    category: 'ecommerce',
  },
  {
    id: 'shopee',
    name: 'Shopee',
    icon: PLATFORM_ICONS.shopee,
    defaultUrl: 'https://shopee.com',
    category: 'ecommerce',
  },
  {
    id: 'lazada',
    name: 'Lazada',
    icon: PLATFORM_ICONS.lazada,
    defaultUrl: 'https://www.lazada.com',
    category: 'ecommerce',
  },
  {
    id: 'etsy',
    name: 'Etsy',
    icon: PLATFORM_ICONS.etsy,
    defaultUrl: 'https://www.etsy.com',
    category: 'ecommerce',
  },
  {
    id: 'wish',
    name: 'Wish',
    icon: PLATFORM_ICONS.wish,
    defaultUrl: 'https://www.wish.com',
    category: 'ecommerce',
  },
  
  // ========== 中国电商平台 ==========
  {
    id: 'taobao',
    name: '淘宝',
    icon: PLATFORM_ICONS.taobao,
    defaultUrl: 'https://www.taobao.com',
    category: 'ecommerce',
  },
  {
    id: 'tmall',
    name: '天猫',
    icon: PLATFORM_ICONS.tmall,
    defaultUrl: 'https://www.tmall.com',
    category: 'ecommerce',
  },
  {
    id: 'jd',
    name: '京东',
    icon: PLATFORM_ICONS.jd,
    defaultUrl: 'https://www.jd.com',
    category: 'ecommerce',
  },
  {
    id: 'pinduoduo',
    name: '拼多多',
    icon: PLATFORM_ICONS.pinduoduo,
    defaultUrl: 'https://www.pinduoduo.com',
    category: 'ecommerce',
  },
  
  // ========== 邮箱平台 ==========
  {
    id: 'gmail',
    name: 'Gmail',
    icon: PLATFORM_ICONS.gmail,
    defaultUrl: 'https://mail.google.com/mail',
    category: 'email',
  },
  {
    id: 'outlook',
    name: 'Outlook',
    icon: PLATFORM_ICONS.outlook,
    defaultUrl: 'https://outlook.live.com/mail',
    category: 'email',
  },
  {
    id: 'yahoo-mail',
    name: 'Yahoo Mail',
    icon: PLATFORM_ICONS['yahoo-mail'],
    defaultUrl: 'https://mail.yahoo.com',
    category: 'email',
  },
  {
    id: 'protonmail',
    name: 'ProtonMail',
    icon: PLATFORM_ICONS.protonmail,
    defaultUrl: 'https://mail.proton.me',
    category: 'email',
  },
  
  // ========== 支付平台 ==========
  {
    id: 'paypal',
    name: 'PayPal',
    icon: PLATFORM_ICONS.paypal,
    defaultUrl: 'https://www.paypal.com',
    category: 'payment',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    icon: PLATFORM_ICONS.stripe,
    defaultUrl: 'https://dashboard.stripe.com',
    category: 'payment',
  },
  
  // ========== 中国支付平台 ==========
  {
    id: 'alipay',
    name: '支付宝',
    icon: PLATFORM_ICONS.alipay,
    defaultUrl: 'https://www.alipay.com',
    category: 'payment',
  },
  
  // ========== 其他平台 ==========
  {
    id: 'github',
    name: 'GitHub',
    icon: PLATFORM_ICONS.github,
    defaultUrl: 'https://github.com',
    category: 'other',
  },
  {
    id: 'google',
    name: 'Google',
    icon: PLATFORM_ICONS.google,
    defaultUrl: 'https://www.google.com',
    category: 'other',
  },
  {
    id: 'microsoft',
    name: 'Microsoft',
    icon: PLATFORM_ICONS.microsoft,
    defaultUrl: 'https://www.microsoft.com',
    category: 'other',
  },
  {
    id: 'apple',
    name: 'Apple',
    icon: PLATFORM_ICONS.apple,
    defaultUrl: 'https://www.apple.com',
    category: 'other',
  },
];

/**
 * 根据平台 ID 获取平台信息
 */
export function getPlatformById(id: string): Platform | undefined {
  return PLATFORMS.find(p => p.id === id);
}

/**
 * 根据分类获取平台列表
 */
export function getPlatformsByCategory(category: Platform['category']): Platform[] {
  return PLATFORMS.filter(p => p.category === category);
}

/**
 * 搜索平台（按名称）
 */
export function searchPlatforms(keyword: string): Platform[] {
  const lowerKeyword = keyword.toLowerCase();
  return PLATFORMS.filter(p => 
    p.name.toLowerCase().includes(lowerKeyword) ||
    p.id.toLowerCase().includes(lowerKeyword)
  );
}

/**
 * 获取平台图标
 */
export function getPlatformIcon(platformId: string | undefined): string {
  if (!platformId) return '🌐';
  return PLATFORM_ICONS[platformId] || '🌐';
}


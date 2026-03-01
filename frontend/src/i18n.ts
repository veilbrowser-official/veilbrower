import i18next from 'i18next';
import { createSignal, onCleanup } from 'solid-js';
import en from './locales/en.json';
import zh from './locales/zh.json';

// 同步初始化 i18next（关键：initImmediate: false）
// 因为 resources 是内联的，不需要异步加载，所以可以强制同步初始化。
// 如果不设置，i18next.init() 内部仍然是异步的（Promise），
// SolidJS 首次渲染时 t() 会返回空字符串，导致菜单文字不可见。
i18next.init({
  lng: 'zh',
  resources: {
    en: { translation: en },
    zh: { translation: zh },
  },
  fallbackLng: 'zh',
  debug: false,
  initImmediate: false, // 强制同步初始化，不走 setTimeout
  interpolation: {
    escapeValue: false,
  },
});

// SolidJS 响应式翻译 Hook
export function useTranslation() {
  // 直接绑定 i18next.t，因为 init 是同步的，此时已完成初始化
  const boundT = i18next.t.bind(i18next);
  const [tFunc, setTFunc] = createSignal(boundT);

  const handleLanguageChanged = () => {
    setTFunc(() => i18next.t.bind(i18next));
  };

  i18next.on('languageChanged', handleLanguageChanged);

  onCleanup(() => {
    i18next.off('languageChanged', handleLanguageChanged);
  });

  return {
    t: (key: string, options?: any): string => tFunc()(key, options) as string,
    i18n: i18next,
  };
}

export default i18next;

import { useLanguage } from './LanguageContext';

export const useTranslation = () => {
  const { t } = useLanguage();
  return { t };
};

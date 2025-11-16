import { theme } from 'antd';

export type ThemeTokens = {
  colorBgContainer: string;
  colorBorder: string;
  colorText: string;
  colorTextSecondary: string;
  borderRadius: string | number;
};

export const useThemeTokens = (): ThemeTokens => {
  const { token } = theme.useToken();
  return {
    colorBgContainer: token.colorBgContainer,
    colorBorder: token.colorBorderSecondary,
    colorText: token.colorText,
    colorTextSecondary: token.colorTextSecondary,
    borderRadius: token.borderRadiusLG || token.borderRadius,
  };
};

// Atkinson Hyperlegible for high legibility

export const fontFamily = {
  regular: 'AtkinsonHyperlegible_400Regular',
  bold: 'AtkinsonHyperlegible_700Bold',
};

export const type = {
  headlineLg: { fontFamily: fontFamily.bold, fontSize: 32, lineHeight: 40, letterSpacing: -0.4 },
  headlineLgMobile: { fontFamily: fontFamily.bold, fontSize: 28, lineHeight: 34 },
  headlineMd: { fontFamily: fontFamily.bold, fontSize: 24, lineHeight: 30 },
  bodyLg: { fontFamily: fontFamily.regular, fontSize: 18, lineHeight: 28 },
  bodyMd: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 24 },
  labelLg: { fontFamily: fontFamily.bold, fontSize: 14, lineHeight: 20, letterSpacing: 0.3 },
  labelMd: { fontFamily: fontFamily.bold, fontSize: 12, lineHeight: 16 },
};

export default type;

export const Colors = {
  cream:   '#e1e0cc',
  cream80: 'rgba(225,224,204,0.8)',
  cream50: 'rgba(225,224,204,0.5)',
  cream30: 'rgba(225,224,204,0.3)',
  cream20: 'rgba(225,224,204,0.2)',
  cream10: 'rgba(225,224,204,0.08)',
  cream05: 'rgba(225,224,204,0.04)',
  black:   '#000000',
  surface: '#101010',
  card:    '#181818',
  card2:   '#1e1e1e',
} as const;

export type ColorKey = keyof typeof Colors;
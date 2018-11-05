import Typography from 'typography'
import theme from 'typography-theme-judah'

const backgroundColor = '#fafafb'
const linkHighlightColor = '#1faa00'
const linkColor = '#263238'

theme.overrideThemeStyles = () => ({
  body: {
    background: backgroundColor,
  },
  '.layout :not(pre) > code[class*="language-"]': {
    padding: '3px .1em',
    borderRadius: '0',
  },
  '::selection': {
    background: backgroundColor /* WebKit/Blink Browsers */,
  },
  '::-moz-selection': {
    background: backgroundColor /* Gecko Browsers */,
  },
  'a:not(.special-link):not(.gatsby-resp-image-link)': {
    borderBottom: `1px dotted ${linkColor}`,
    textDecoration: 'none',
    color: linkColor,
    transition: 'color 0.25s ease',
  },
  'a:not(.special-link):not(.gatsby-resp-image-link):hover': {
    color: linkHighlightColor,
    borderBottom: `1px dotted ${linkHighlightColor}`,
  },
})

const typography = new Typography(theme)

// Hot reload typography in development.
if (process.env.NODE_ENV !== 'production') {
  typography.injectStyles()
}

export default typography

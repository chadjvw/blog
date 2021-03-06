import * as React from 'react'

export default class BlogpostHeader extends React.Component<BlogpostHeaderProps> {
  render() {
    return (
      <div style={{ marginBottom: '0' }}>
        <div style={{ marginBottom: '20px', marginTop: '-15px' }}>
          <span itemProp="datePublished">{this.props.date}</span>
          <span>・</span>
          <span itemProp="timeRequired">{`${this.props.readTime} min `}</span>
          <span>read</span>
        </div>
      </div>
    )
  }
}

interface BlogpostHeaderProps {
  date: string
  readTime: string
  title: string
  url: string
}

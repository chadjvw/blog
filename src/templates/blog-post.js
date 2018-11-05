import * as React from 'react'
import { graphql } from 'gatsby'
import Layout from '../components/layout/layout'
import SEO from '../utils/seo'
import BlogpostHeader from '../components/blogpost-header/blogpost-header'
import TagsBlock from '../components/tags-block/tags-block'

class BlogPostTemplate extends React.Component {
  render() {
    const post = this.props.data.markdownRemark
    const siteMeta = this.props.data.site.siteMetadata

    const indexSeo = {
      title: `${post.frontmatter.title}`,
      description: post.excerpt,
      image: siteMeta.image,
      url: `${this.props.data.site.siteMetadata.siteUrl}${post.fields.urlPath}`,
      isBlogpost: true,
      twitter: siteMeta.twitter,
    }

    return (
      <Layout location={this.props.location}>
        <div itemScope itemType="http://schema.org/BlogPosting">
          <SEO {...indexSeo} />
          <h1 itemProp="headline">{post.frontmatter.title}</h1>
          <BlogpostHeader
            date={post.frontmatter.date}
            readTime={post.timeToRead}
            title={post.frontmatter.title}
            url={indexSeo.url}
          />
          <div itemProp="articleBody" dangerouslySetInnerHTML={{ __html: post.html }} />
          <div itemProp="author">- Chad Van Wyhe</div>
          <TagsBlock tags={post.frontmatter.tags} />
          <hr />
        </div>
      </Layout>
    )
  }
}

export default BlogPostTemplate

export const pageQuery = graphql`
  query BlogPostByPath($path: String!) {
    site {
      siteMetadata {
        title
        author
        title
        description
        image
        siteUrl
        twitter
      }
    }
    markdownRemark(fields: { urlPath: { eq: $path } }) {
      id
      html
      excerpt
      timeToRead
      fields {
        urlPath
      }
      frontmatter {
        title
        date(formatString: "MMMM DD, YYYY")
        tags
      }
    }
  }
`

import { Link, graphql } from 'gatsby'
import * as React from 'react'
import Layout from '../components/layout/layout'
import LinkMenu from '../components/link-menu/link-menu'
import SEO from '../utils/seo'

export default class Index extends React.Component {
  render() {
    const indexSeo = {
      title: `${this.props.data.site.siteMetadata.title}`,
      description: this.props.data.site.siteMetadata.description,
      image: this.props.data.site.siteMetadata.image,
      url: `${this.props.data.site.siteMetadata.siteUrl}`,
      isBlogpost: false,
      twitter: this.props.data.site.siteMetadata.twitter,
    }
    return (
      <Layout location={this.props.location}>
        <SEO {...indexSeo} />
        <LinkMenu>
          <div className="link-block">
            <div className="link-block-title">WORK</div>
            <div className="link-block-content">
              <a href="https://www.powercosts.com/" title="Power Costs, Inc." target="blank">
                Norman, OK, USA
              </a>
              <div>Senior Software Developer</div>
            </div>
          </div>
          <div className="link-block">
            <div className="link-block-title">BLOG</div>
            <div className="link-block-content">
              {this.props.data.allMarkdownRemark.edges.map(({ node }, index) => {
                return (
                  <div key={`link-${index}`} className="blog-links">
                    <Link to={node.fields.urlPath} title={node.frontmatter.title}>
                      {node.frontmatter.title}
                    </Link>
                  </div>
                )
              })}
              <div className="go-to-list">
                <Link className="see-more" to={'/blog/'} title={'See more'}>
                  See more
                </Link>
              </div>
            </div>
          </div>
          <div className="link-block">
            <div className="link-block-title">About me</div>
            <div className="link-block-content">
              My software journey began with VBA back in 2010 while deployed to Afganistan. Since then I started work as
              a software developer and have learned a ton from the open source community. This blog allows me to give
              back to the community that has helped me learn and grow. I love using the right tool for the right job and
              finding the best solution to solve a problem. I hold 2 AWS Associate Certifications and love all things
              cloud and serverless.
            </div>
          </div>
        </LinkMenu>
      </Layout>
    )
  }
}

export const pageQuery = graphql`
  query IndexQuery {
    site {
      siteMetadata {
        title
        description
        image
        siteUrl
        twitter
      }
    }
    allMarkdownRemark(sort: { fields: [frontmatter___date], order: DESC }) {
      edges {
        node {
          excerpt
          fields {
            urlPath
          }
          frontmatter {
            date(formatString: "DD MMMM, YYYY")
            title
            tags
          }
        }
      }
    }
  }
`

import React from 'react'
import './bio.scss'
// import * as ProfilePic from "./profile-pic.jpg"

class Bio extends React.Component {
  render() {
    return (
      <div className="bio">
        {/* <img
          src={ProfilePic}
          alt={`Sevket Yalcin`}
        /> */}
        <p>
          Developer who lives and works in Norman. <br />I build stuff on my free time and blog about it here. <br />I
          also often improve this blog, you can find the code on my{' '}
          <a target="blank" href="https://github.com/chadjvw/blog" title="Go to this blog's Github repo">
            Github
          </a>
          . Don't hesitate to leave me a comment!
        </p>
      </div>
    )
  }
}

export default Bio

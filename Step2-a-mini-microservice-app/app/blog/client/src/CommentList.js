import React from "react";

export default ( { comments } ) => {
    // console.log(comments);
    const renderedComments = comments.length ? comments.map((comment, index) => {
        return <li key={comment.id}>{comment.content}</li>;
    }) : null;
    return <ul>
        { renderedComments }
    </ul>
}
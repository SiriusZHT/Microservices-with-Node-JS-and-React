import React from "react";

export default ( { comments } ) => {
    // console.log(comments);
    const renderedComments = comments.length ? comments.map((comment, index) => {
        let content;
        let status = comment.status;
        switch(status) {
            case 'approved':
                content = comment.content;
            case 'pending':
                content = 'This comment is await moderation';
            case 'rejected':
                content = 'This comment has been rejected';
            default:
                content = 'This comment is await moderation';
        }

        return <li key={comment.id}>{content}</li>;
    }) : null;
    return <ul>
        { renderedComments }
    </ul>
}
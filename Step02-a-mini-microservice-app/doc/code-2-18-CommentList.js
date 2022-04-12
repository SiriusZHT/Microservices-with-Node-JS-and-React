// https://github.com/SiriusZHT/Microservices-with-Node-JS-and-React/commit/5a895bd5bb09ef4a5970ae138bf1051c4704007b

import React from "react";

export default ( { comments } ) => {
    // console.log(comments);
    const renderedComments = comments.length ? comments.map((comment, index) => {
        let content;
        let status = comment.status;
        console.log(status)
        if(status === 'approved') 
            content = comment.content;
        if(status === 'pending')
            content = 'This comment is await moderation';
        if(status === 'rejected')
            content = 'This comment has been rejected';

        return <li key={comment.id}>{content}</li>;
    }) : null;
    return <ul>
        { renderedComments }
    </ul>
}
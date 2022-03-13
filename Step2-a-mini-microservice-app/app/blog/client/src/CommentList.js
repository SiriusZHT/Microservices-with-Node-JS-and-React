import React, { useState, useEffect } from "react";
import axios from 'axios';

export default ( { postId } ) => {
    const [comments, setComments] = useState([]);

    const fetchComment = async () => {
        const res = await axios.get(`http://121.5.150.79:4001/posts/${postId}/comments`);
        setComments(res.data);
    }

    useEffect(() => {
        fetchComment();
    }, []);
    const renderedComments = comments.length ? comments.map((comment, index) => {
        return <li key={comment.id}>{comment.content}</li>;
    }) : null;
    return <ul>
        { renderedComments }
    </ul>
}
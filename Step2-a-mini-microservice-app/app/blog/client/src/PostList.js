import React from "react";
import { useState, useEffect } from "react";
import axios from "axios";
import CommentCreate from "./CommentCreate";
import CommentList from "./CommentList";

export default () => {
    const [posts, setPosts] = useState('');
    const fetchPosts = async () => {
        const res = await axios.get('http://121.5.150.79:4002/posts');
        // console.log(res.data);
        setPosts(res.data);
    }
    useEffect(() => {
        fetchPosts();
    }, []);
    const renderedPosts = Object.values(posts).map((post, index) => {
        return (
            <div
                className="card"
                style={{ width: '32%', marginBottom: '20px', marginLeft: '20px'}}
                key={post.id}
            >
                <div className="card-body">
                    <h4 className="card-title">{"【No." + index + "】 " + post.title}</h4>
                    <CommentList comments={post.comments}/>
                    <CommentCreate postId={post.id}/>
                </div>
            </div>
        )
    })
    return <div className="postsContainer" style={{display: 'flex', flexWrap: 'wrap'}}>
        { renderedPosts }
    </div>
}
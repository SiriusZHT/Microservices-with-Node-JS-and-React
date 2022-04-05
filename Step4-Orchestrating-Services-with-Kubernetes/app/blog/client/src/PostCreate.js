import React from "react";
import { useState } from "react";
import axios from "axios"
export default () => {
    const [title, setTitle] = useState('');
    const onSubmit = async (event) => {
        // preventDefault() 事件方法，会取消该事件，这意味着属于该事件的默认操作将不会发生。
        // 单击“提交”按钮，阻止其提交表单（默认是直接把整个form表单submit出去）
        // 单击链接，防止链接跟随 URL
        // return false 等同于
        // e.preventDefault(); // 阻止提交
        // e.stopPropagation(); // 阻止冒泡
        // 的组合。
        // 想更清楚的了解区别，看看这个在线调试：http://www.gbtags.com/gb/debug/de1361ab-0605-4c6d-a21b-8c082e3bd251.htm
        event.preventDefault();

        await axios.post('http://www.demo.io/posts/create', {
            title
        })
        // 每次完成 都 重置
        setTitle('');
    }
    return <div>
        <form onSubmit={onSubmit}>
            <div className="form-group">
                <label>Title</label>
                <input value={title} onChange={e => setTitle(e.target.value)} className="form-control"/>
            </div>
            <button className="btn btn-primary">Submit</button>
        </form>
    </div>
}
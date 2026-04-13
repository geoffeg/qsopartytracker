const censorCommentFrequency = (comment) => {
    if (!comment) return "";
    if (typeof comment === 'string') {
        return comment.replace(/\s+([0-9\.]+)/g, ' XXXXX')
    }
    return "";
}

export default censorCommentFrequency;
const censorCommentFrequency = (comment) => {
    if (!comment) return "";
    if (typeof comment === 'string') {
        return comment.replace(/([0-9\.]{3,})/g, (match) => 'X'.repeat(match.length))
    }
    return "";
}

export default censorCommentFrequency;
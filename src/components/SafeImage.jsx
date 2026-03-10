import React, { useState } from 'react'

const SafeImage = ({ src, alt, fallbackText, className, style, containerClassName = '' }) => {
    const [hasError, setHasError] = useState(false)

    if (!src || hasError) {
        return (
            <div className={`flex items-center justify-center font-bold overflow-hidden ${containerClassName}`} style={style}>
                {fallbackText}
            </div>
        )
    }

    return (
        <img
            src={src}
            alt={alt}
            className={className}
            style={style}
            referrerPolicy="no-referrer"
            onError={() => setHasError(true)}
        />
    )
}

export default SafeImage

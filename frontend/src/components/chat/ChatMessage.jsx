import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { Bot, User } from 'lucide-react'
import { format } from 'date-fns'

export default function ChatMessage({ message }) {
  const isUser = message.role === 'user'

  return (
    <div
      className={cn(
        'flex gap-3 animate-fade-in',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      <Avatar className="h-8 w-8 shrink-0 mt-1">
        <AvatarFallback
          className={cn(
            'text-xs',
            isUser
              ? 'bg-gradient-to-br from-indigo-500 to-blue-500 text-white'
              : 'bg-white text-foreground border border-white/70'
          )}
        >
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>

      <div className={cn('flex flex-col gap-1 max-w-[80%]', isUser && 'items-end')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm shadow-soft',
            isUser
              ? 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-tr-sm'
              : 'bg-white/80 border border-white/70 text-foreground rounded-tl-sm'
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <ReactMarkdown
              className="prose prose-sm dark:prose-invert max-w-none"
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '')
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={oneDark}
                      language={match[1]}
                      PreTag="div"
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={cn('bg-muted px-1 rounded text-xs', className)} {...props}>
                      {children}
                    </code>
                  )
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>

        {/* Sources */}
        {message.sources && message.sources.length > 0 && (
          <div className="text-xs text-muted-foreground mt-1">
            <span className="font-medium">Sources: </span>
            {message.sources.map((src, i) => (
              <span key={i} className="mr-2 underline cursor-pointer hover:text-primary">
                {src.title || src.source}
              </span>
            ))}
          </div>
        )}

        <span className="text-xs text-muted-foreground">
          {message.createdAt ? format(new Date(message.createdAt), 'HH:mm') : ''}
        </span>
      </div>
    </div>
  )
}

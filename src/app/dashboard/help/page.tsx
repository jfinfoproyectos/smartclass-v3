import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { getRoleFromUser } from "@/features/auth/services/authService"
import { readFile } from "fs/promises"
import { join } from "path"
import { redirect } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Separator } from "@/components/ui/separator"

async function getHelpContent() {
    const session = await auth.api.getSession({ headers: await headers() })

    if (!session?.user) {
        redirect("/")
    }

    const role = getRoleFromUser(session.user)

    // Determine which help file to load based on role
    let helpFile = "help-student.md"
    let roleTitle = "Estudiante"

    if (role === "admin") {
        helpFile = "help-admin.md"
        roleTitle = "Administrador"
    } else if (role === "teacher") {
        helpFile = "help-teacher.md"
        roleTitle = "Profesor"
    }

    // Read the markdown file
    const filePath = join(process.cwd(), "src", "content", "help", helpFile)
    const content = await readFile(filePath, "utf-8")

    return { content, role, roleTitle }
}

export default async function HelpPage() {
    const { content, roleTitle } = await getHelpContent()

    return (
        <div className="container mx-auto py-6 max-w-5xl pb-16">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold mb-2">Centro de Ayuda</h1>
                <p className="text-lg text-muted-foreground">
                    Guía completa para {roleTitle}
                </p>
            </div>

            <Separator className="mb-8" />

            {/* Content */}
            <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                        h1: ({ children }) => (
                            <h1 className="text-3xl font-bold mt-8 mb-4 text-foreground border-b pb-2">
                                {children}
                            </h1>
                        ),
                        h2: ({ children }) => (
                            <h2 className="text-2xl font-semibold mt-8 mb-4 text-foreground">
                                {children}
                            </h2>
                        ),
                        h3: ({ children }) => (
                            <h3 className="text-xl font-semibold mt-6 mb-3 text-foreground">
                                {children}
                            </h3>
                        ),
                        h4: ({ children }) => (
                            <h4 className="text-lg font-semibold mt-4 mb-2 text-foreground">
                                {children}
                            </h4>
                        ),
                        h5: ({ children }) => (
                            <h5 className="text-base font-semibold mt-3 mb-2 text-foreground">
                                {children}
                            </h5>
                        ),
                        p: ({ children }) => (
                            <p className="mb-4 leading-7 text-foreground">
                                {children}
                            </p>
                        ),
                        ul: ({ children }) => (
                            <ul className="list-disc list-outside ml-6 mb-4 space-y-2 text-foreground">
                                {children}
                            </ul>
                        ),
                        ol: ({ children }) => (
                            <ol className="list-decimal list-outside ml-6 mb-4 space-y-2 text-foreground">
                                {children}
                            </ol>
                        ),
                        li: ({ children }) => (
                            <li className="text-foreground leading-7">{children}</li>
                        ),
                        strong: ({ children }) => (
                            <strong className="font-semibold text-foreground">
                                {children}
                            </strong>
                        ),
                        em: ({ children }) => (
                            <em className="italic text-foreground">{children}</em>
                        ),
                        code: ({ children }) => (
                            <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground border">
                                {children}
                            </code>
                        ),
                        pre: ({ children }) => (
                            <pre className="bg-muted p-4 rounded-lg overflow-x-auto mb-4 border">
                                {children}
                            </pre>
                        ),
                        hr: () => <hr className="my-8 border-border" />,
                        blockquote: ({ children }) => {
                            // Check if this is a GitHub-style alert
                            const firstChild = Array.isArray(children) ? children[0] : children
                            const childText = typeof firstChild === 'string' ? firstChild : ''

                            const alertTypes: Record<string, { className: string; icon: string }> = {
                                '[!NOTE]': { className: 'border-blue-500 bg-blue-50 dark:bg-blue-950/30', icon: 'ℹ️' },
                                '[!TIP]': { className: 'border-green-500 bg-green-50 dark:bg-green-950/30', icon: '💡' },
                                '[!IMPORTANT]': { className: 'border-purple-500 bg-purple-50 dark:bg-purple-950/30', icon: '❗' },
                                '[!WARNING]': { className: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30', icon: '⚠️' },
                                '[!CAUTION]': { className: 'border-red-500 bg-red-50 dark:bg-red-950/30', icon: '🚨' },
                            }

                            for (const [type, style] of Object.entries(alertTypes)) {
                                if (childText.includes(type)) {
                                    return (
                                        <div className={`border-l-4 ${style.className} p-4 my-4 rounded-r`}>
                                            <div className="flex gap-2">
                                                <span className="text-xl">{style.icon}</span>
                                                <div className="flex-1">
                                                    {children}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                }
                            }

                            return (
                                <blockquote className="border-l-4 border-primary pl-4 italic my-4 text-muted-foreground">
                                    {children}
                                </blockquote>
                            )
                        },
                        table: ({ children }) => (
                            <div className="overflow-x-auto my-6">
                                <table className="min-w-full divide-y divide-border border rounded-lg">
                                    {children}
                                </table>
                            </div>
                        ),
                        thead: ({ children }) => (
                            <thead className="bg-muted">
                                {children}
                            </thead>
                        ),
                        tbody: ({ children }) => (
                            <tbody className="divide-y divide-border bg-background">
                                {children}
                            </tbody>
                        ),
                        tr: ({ children }) => (
                            <tr className="hover:bg-muted/50 transition-colors">
                                {children}
                            </tr>
                        ),
                        th: ({ children }) => (
                            <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                                {children}
                            </th>
                        ),
                        td: ({ children }) => (
                            <td className="px-4 py-3 text-sm text-foreground">
                                {children}
                            </td>
                        ),
                        a: ({ children, href }) => (
                            <a
                                href={href}
                                className="text-primary hover:underline font-medium"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {children}
                            </a>
                        ),
                    }}
                >
                    {content}
                </ReactMarkdown>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t text-center text-sm text-muted-foreground">
                <p>¿Necesitas más ayuda? Contacta a tu administrador o profesor.</p>
            </div>
        </div>
    )
}

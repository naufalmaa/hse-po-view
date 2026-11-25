import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {APP_CONFIG} from "@/constants/config";
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'
import { useAppTranslation } from '@/lib/i18n-typed'
import { useEmployeeLogin } from '@/service/employee/employee-login'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { useAuth } from "@/hooks/use-auth"
import { showNotifError } from "@/lib/show-notif"
import { AppRoute } from '@/constants/app-route'

export const Route = createFileRoute('/_auth/login-employee')({
    component: LoginEmployeePage,
})

const formSchema = z.object({
    hssePassport: z.string().min(1, { message: "HSSE Passport wajib diisi" }), // Fallback message
    password: z.string().min(1, { message: "Password wajib diisi" }),
})

function LoginEmployeePage() {
    const { t } = useAppTranslation()
    const navigate = useNavigate()
    const auth = useAuth()
    const [showPassword, setShowPassword] = useState(false)
    const loginMutation = useEmployeeLogin()

    // Custom schema with translations
    const schema = z.object({
        hssePassport: z.string().min(1, { message: t($ => $.employeeLogin.hssePassportLabel) + " wajib diisi" }),
        password: z.string().min(1, { message: t($ => $.employeeLogin.passwordLabel) + " wajib diisi" }),
    })

    const form = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
        defaultValues: {
            hssePassport: "",
            password: "",
        },
    })

    async function onSubmit(values: z.infer<typeof schema>) {
        loginMutation.mutate({
            body: {
                hssePassportNumber: values.hssePassport,
                password: values.password
            }
        }, {
            onSuccess: async (data) => {
                if (data.token && data.user) {
                    // Assuming auth.login expects { token, user }
                    await auth.login({ token: data.token, user: data.user })
                    // Redirect to employee dashboard or attendance page (based on HTML logic it was employee-attendance.html)
                    // I'll assume index or a specific route. The user didn't specify target but usually it's home /
                    navigate({ to: '/' })
                } else {
                    showNotifError({ message: data.message || t($ => $.employeeLogin.errorMessage) })
                }
            },
            onError: (error: any) => {
                // showNotifError({ message: error?.response?.data?.message || t($ => $.employeeLogin.networkError) })
            }
        })
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[linear-gradient(135deg,#1e3a5f_0%,#2563eb_100%)] font-sans">
            <div className="bg-white rounded-[24px] p-8 md:p-12 w-full max-w-[420px] shadow-2xl animate-in fade-in zoom-in duration-500">

                {/* Logo Section */}
                <div className="text-center mb-8">
                    {/* <div className="w-20 h-20 bg-gradient-to-br from-[#1e3a5f] to-[#2563eb] rounded-[20px] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/40">
                        <svg
                            className="w-10 h-10 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    </div> */}
                    <div className="text-center mb-6">
                        <img src={APP_CONFIG.app.loginLogo} alt={APP_CONFIG.app.name} className={"w-auto h-24 mx-auto mb-8"} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 mb-1">{t($ => $.employeeLogin.title)}</h1>
                    <p className="text-slate-500 text-sm">{t($ => $.employeeLogin.subtitle)}</p>
                </div>

                {/* Error Message */}
                {loginMutation.isError && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm mb-5 flex items-center gap-2 animate-in slide-in-from-top-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{(loginMutation.error as any)?.response?.data?.message || t($ => $.employeeLogin.networkError)}</span>
                    </div>
                )}

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                        <FormField
                            control={form.control}
                            name="hssePassport"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-medium text-slate-800">{t($ => $.employeeLogin.hssePassportLabel)}</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={t($ => $.employeeLogin.hssePassportPlaceholder)}
                                            className="py-6 px-4 border-2 border-slate-200 rounded-xl focus:border-[#1e4a8f] focus:ring-4 focus:ring-[#1e4a8f]/10 transition-all font-medium"
                                            disabled={loginMutation.isPending}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-medium text-slate-800">{t($ => $.employeeLogin.passwordLabel)}</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                placeholder={t($ => $.employeeLogin.passwordPlaceholder)}
                                                className="py-6 pl-4 pr-12 border-2 border-slate-200 rounded-xl focus:border-[#1e4a8f] focus:ring-4 focus:ring-[#1e4a8f]/10 transition-all font-medium"
                                                disabled={loginMutation.isPending}
                                                {...field}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                                                title={t($ => $.employeeLogin.togglePasswordTitle)}
                                            >
                                                {showPassword ? (
                                                    <EyeOff className="h-5 w-5" />
                                                ) : (
                                                    <Eye className="h-5 w-5" />
                                                )}
                                            </button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button
                            type="submit"
                            className="w-full py-6 bg-[#1e4a8f] hover:bg-[#2a5db8] text-white rounded-xl font-semibold shadow-lg shadow-blue-600/30 text-base transition-all hover:-translate-y-0.5"
                            disabled={loginMutation.isPending}
                        >
                            {loginMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    {t($ => $.employeeLogin.loading)}
                                </>
                            ) : (
                                t($ => $.employeeLogin.loginButton)
                            )}
                        </Button>
                    </form>
                </Form>

                <div className="text-center mt-6">
                    <a href="/" className="text-sm font-medium text-[#1e4a8f] hover:underline">
                        {t($ => $.employeeLogin.footerLink) || "Kembali ke Beranda"}
                    </a>
                </div>
            </div>
        </div>
    )
}

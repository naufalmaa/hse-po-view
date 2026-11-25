import * as React from 'react'
import {
  createFileRoute,
  redirect,
} from '@tanstack/react-router'
import { z } from 'zod'

import { createSignInBodyParam, SignInForm } from "@/components/pages/auth/sign-in";
import { SubmitHandler } from 'react-hook-form'
import { isContractor, isCrew, LoginFormValues } from "@/types/auth";
import { useLoginMutation } from "@/service/auth-api";
import { APP_CONFIG } from '@/constants/config';
import { AppRoute } from "@/constants/app-route";
import { Link } from '@tanstack/react-router';
import { useAppTranslation } from '@/lib/i18n-typed';

const fallback = '/' as const
export const Route = createFileRoute('/_auth/login')({
  validateSearch: z.object({
    redirect: z.string().optional().catch(''),
  }),
  beforeLoad: ({ context, search }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: search.redirect || fallback })
    }
  },
  component: LoginComponent,
})

function LoginComponent() {
  const { t } = useAppTranslation();
  const navigate = Route.useNavigate()
  const search = Route.useSearch()

  const loginMutation = useLoginMutation();
  const [errorMessage, setErrorMessage] = React.useState<string | undefined>(undefined);

  const onFormSubmit: SubmitHandler<LoginFormValues> = (data) => {
    setErrorMessage(undefined);
    loginMutation.mutate(
      { body: createSignInBodyParam(data) },
      {
        onSuccess: (data: any) => {
          if (isContractor(data?.user)) {
            navigate({ to: APP_CONFIG.path.defaultContractor }).then(() => {
            })
          } else if (isCrew(data?.user)) {
            navigate({ to: APP_CONFIG.path.defaultCrew }).then(() => {
            })
          }
          else {
            navigate({ to: search.redirect || fallback })
          }
        },
        onError: (error: Record<string, any>) => {
          setErrorMessage(error?.response?.data?.message || error?.response?.data?.error || error?.message)
        },
      }
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-background to-indigo-50 flex items-center justify-center p-4 relative dark:from-blue-950/30 dark:to-indigo-950/30">
      <img src={'/images/login-bg.jpg'} alt="Login Background" className={"absolute h-screen w-screen object-cover"} />
      {/* <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-10 -left-10 w-56 h-56 bg-purple-500 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute top-1/2 -right-10 w-64 h-64 bg-blue-500 rounded-full opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute -bottom-10 left-1/2 w-36 h-36 bg-indigo-500 rounded-full opacity-20 animate-pulse delay-500"></div>
      </div> */}
      {/* Main content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Login card */}
        <div className="bg-card/30 border border-border/50 rounded-2xl p-10 shadow-2xl transition-all hover:shadow-3xl hover:border-blue-500/30">
          {/* <div className={"mb-6"}>
            <img src={"/images/hse.png"} alt={"PHE OSES"} className={"h-10 w-40"} />
          </div> */}

          <div className="text-center mb-6">
            {/* <div className={"text-3xl font-bold text-primary mb-4 text-shadow-md/20"}>PheView HSE</div> */}
            <img src={APP_CONFIG.app.loginLogo} alt={APP_CONFIG.app.name} className={"w-auto h-24 mx-auto mb-8"} />
            {/*<h2 className="text-2xl font-semibold text-foreground mb-2">{t($ => $.signIn.welcomeBack)}</h2>*/}
            {/*<p className="text-muted-foreground">{t($ => $.signIn.signInDescription)}</p>*/}
          </div>

          <div className={'flex mb-5'}>
            <div className={"rounded-full bg-gradient-to-br from-[#1F58AE] to-[#6E95E4] px-6 py-1 text-white"}>Get Started</div>
          </div>
          <SignInForm onFormSubmit={onFormSubmit} loading={loginMutation.isPending} errorMessage={errorMessage} />

          <div className="mt-6 text-center">
            <Link
              to={AppRoute.auth.signInEmployee.url}
              className="text-lg font-medium text-secondary hover:text-secondary/80 transition-colors flex items-center justify-center gap-2 hover:underline"
            >
              <span>{t($ => $.signIn.loginEmployee)}</span>
            </Link>
          </div>

        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-xs text-muted-foreground/70">
          <p>© {new Date().getFullYear()} {t($ => $.signIn.footerCopyright)}</p>
        </div>
      </div>
    </div>
  )
}

export default LoginComponent
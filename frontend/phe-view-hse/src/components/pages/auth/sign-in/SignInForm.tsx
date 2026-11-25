import { SubmitHandler, useForm } from "react-hook-form";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod"
import { LoginFormValues } from "@/types/auth";
import { FormInput, FormPassword } from "@/components/custom/forms";
import { Loader2, Mail, Lock, LogIn, AlertCircle } from "lucide-react";
import { signInFormData, createSignInSchema } from "./templates/sign-in-template";
import { useAppTranslation } from "@/lib/i18n-typed";
import { AppRoute } from "@/constants/app-route";

type Props = {
  onFormSubmit: SubmitHandler<LoginFormValues>
  loading?: boolean,
  errorMessage?: string,
}

export const SignInForm = ({ onFormSubmit, loading, errorMessage }: Props) => {
  const { t } = useAppTranslation();

  // Create schema with translated error messages
  const schema = createSignInSchema(t);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    defaultValues: signInFormData.defaultValue,
  });

  // Create a copy of the form data with translated labels and placeholders
  const translatedFormData = {
    ...signInFormData,
    form: {
      email: {
        ...signInFormData.form.email,
        label: "",
        placeholder: t($ => $.signIn.emailPlaceholder),
      },
      password: {
        ...signInFormData.form.password,
        label: "",
        placeholder: t($ => $.signIn.passwordPlaceholder),
      }
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-5">
        {errorMessage && (
          <div className="bg-destructive/40 border border-destructive/20 rounded-lg p-3 flex items-start space-x-2">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="text-sm text-destructive font-medium">{errorMessage}</div>
          </div>
        )}
        <div className="space-y-8">
          <div className="relative">
            <Mail className="absolute left-3 top-6 h-4 w-4 text-muted-foreground" />
            <FormInput
              form={form}
              item={translatedFormData.form.email}
              className="pl-10 h-12 bg-input  rounded-full [&:-webkit-autofill]:text-blue-600 focus:[&:-webkit-autofill]:text-blue-600"
            />
          </div>
          <div className="relative">
            <FormPassword
              form={form}
              item={translatedFormData.form.password}
              className="pl-10 h-12 bg-input  rounded-full"
            />
            <Lock className="absolute left-3 top-6 h-4 w-4 text-muted-foreground " />
          </div>
        </div>

        {/* <div className="flex items-center justify-between text-sm">
          <label className="flex items-center space-x-2 text-muted-foreground cursor-pointer">
            <input type="checkbox" className="rounded border-border" />
            <span>{t($ => $.labels.rememberMe)}</span>
          </label>
          <a href={AppRoute.auth.forgotPassword.url} className="text-primary hover:text-primary/80 font-medium transition-colors">
            {t($ => $.labels.forgotPassword)}
          </a>
        </div> */}

        <div className={'w-full flex items-center justify-center mt-8'}>
          <Button
            type="submit"
            className="h-12 bg-[#3C85F4] rounded-full w-full disabled:opacity-100"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t($ => $.labels.signIn)}...
              </>
            ) : (
              <>
                <LogIn className="mr-2 h-4 w-4" />
                {t($ => $.labels.signIn)}
              </>
            )}
          </Button>
        </div>
        {/* <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {t($ => $."signIn.newUser)}{" "}
            <a href={AppRoute.auth.signUp.url} className="text-primary hover:text-primary/80 font-medium transition-colors">
              {t($ => $.labels.signUp)}
            </a>
          </p>
        </div> */}
      </form>
    </Form>
  )
}
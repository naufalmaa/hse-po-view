import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {z} from "zod";
import {formList} from "../lib/project-template";
import {Form} from "@/components/ui/form";
import {ControlForm} from "@/components/custom/forms";
import * as React from "react";
import {useEffect} from "react";
import FormTitle from "@/components/pages/daily-report/create/components/FormTitle";
import {cn} from "@/lib/utils";

type Props = {
  formTitle?: string;
  formDescription?: string;
  onBackClick?: () => void;
  onSubmitClicked: (obj: Record<any, any>) => void;
  className?: string,
  defaultValues?: Record<string, any>,
  loading: boolean
}

const Form08Inspection = ({
                                  formTitle, formDescription,
                                  onBackClick, onSubmitClicked, className, defaultValues, loading
                                }: Props) => {
  const formData = formList?.inspection;
  const formItems = formData?.form;
  const form = useForm<any>({
    resolver: zodResolver(z.object(formData?.schema)),
    defaultValues: formData?.defaultValue,
  });

  // Reset form when defaultValues change
  useEffect(() => {
    if (defaultValues) {
      form.reset(defaultValues);
    }
  }, [defaultValues]);

  return (
    <div>
      <FormTitle form={form} title={formTitle} description={formDescription} onSubmitClicked={onSubmitClicked}
                 disabled={loading}/>
      <div className={"flex flex-col gap-4 p-1"}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmitClicked)} className={cn(className, "")} onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
            }
          }}>
            <div>
              <ControlForm form={form} item={formItems?.description} disabled={loading}/>
            </div>
            <div className={"grid md:grid-cols-2 lg:grid-cols-3 grid-cols-1 gap-4"}>
              <ControlForm form={form} item={formItems?.openFinding} disabled={loading}/>
              <ControlForm form={form} item={formItems?.closeFinding} disabled={loading}/>
              <ControlForm form={form} item={formItems?.outstandingFinding} disabled={loading}/>
              <ControlForm form={form} item={formItems?.unsafeCondition} disabled={loading}/>
            </div>
            <div className={"grid md:grid-cols-2 grid-cols-1 gap-4"}>
              <ControlForm form={form} item={formItems?.followUp} disabled={loading}/>
              <ControlForm form={form} item={formItems?.todayDescription} disabled={loading}/>
            </div>
            <div className={"grid md:grid-cols-2 lg:grid-cols-3 grid-cols-1 gap-4"}>
              <ControlForm form={form} item={formItems?.todayInspection} disabled={loading}/>
              <ControlForm form={form} item={formItems?.monthlyInspection} disabled={loading}/>
              <ControlForm form={form} item={formItems?.ytdInspection} disabled={loading}/>
            </div>

            {/*<FormButtons form={form} onBackClick={onBackClick} onNextClick={onNextClick}/>*/}
          </form>
        </Form>
      </div>
    </div>
  )
}
export default Form08Inspection
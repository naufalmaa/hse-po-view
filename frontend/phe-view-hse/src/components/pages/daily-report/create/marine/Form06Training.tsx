import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {z} from "zod";
import {marineFormList} from "../lib/marine-template";
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

const Form06Training = ({
                          formTitle, formDescription,
                          onBackClick, onSubmitClicked, className, defaultValues, loading
                        }: Props) => {
  const formData = marineFormList?.training;
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
            <div className={"grid md:grid-cols-2 xl:grid-cols-3 grid-cols-1 gap-4"}>
              <ControlForm form={form} item={formItems?.sika} disabled={loading}/>
              <ControlForm form={form} item={formItems?.shipboardTraining} disabled={loading}/>
              <ControlForm form={form} item={formItems?.othersTraining} disabled={loading}/>
            </div>

            {/*<FormButtons form={form} onBackClick={onBackClick} onNextClick={onNextClick}/>*/}
          </form>
        </Form>
      </div>
    </div>
  )
}
export default Form06Training
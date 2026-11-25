import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {z} from "zod";
import {useEffect} from "react";
import {cn} from "@/lib/utils";
import {Form} from "@/components/ui/form";
import {ControlForm} from "@/components/custom/forms";
import * as React from "react";
import { Button } from "@/components/ui/button";

type Props = {
  title: string;
  className?: string;
  defaultValues?: Record<string, any>;
  onSubmitClicked: (obj: Record<any, any>) => void;
}
const FormOverstayPersonnel = ({
                           title,
                           className,
                           defaultValues,
                           onSubmitClicked
                         }: Props) => {
  const formItems = {
    name: {
      type: "text",
      name: "name",
      label: "Participant Name",
    },
    company: {
      type: "text",
      name: "company",
      label: "Company",
    },
    dob: {
      type: "text",
      name: "dob",
      label: "DOB",
    },
  };
  const form = useForm<any>({
    resolver: zodResolver(z.object({
      name: z.string().min(1, "Participant Name is required"),
      company: z.string().min(1, "Company is required"),
      dob: z.string().min(1, "DOB is required"),
    })),
    defaultValues: {
      name: "",
      company: "",
      dob: "",
    },
  });

  // Reset form when defaultValues change
  useEffect(() => {
    if (defaultValues) {
      form.reset(defaultValues);
    }
  }, [defaultValues]);


  const onSubmitClicked_ = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const isValid = await form.trigger();
    if (isValid) {
      if (onSubmitClicked) {
        onSubmitClicked(form.getValues());
      }
    }
  }

  return (
    <div className={"flex flex-col gap-4"}>
      <div className={"text-lg font-bold"}>{title}</div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmitClicked_)} className={cn(className, "")} onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
          }
        }}>
          <div className={"flex flex-col gap-4"}>
            <ControlForm form={form} item={formItems?.name}/>
            <ControlForm form={form} item={formItems?.company}/>
            <ControlForm form={form} item={formItems?.dob}/>
            <Button type={"submit"} onClick={(event: React.MouseEvent<HTMLButtonElement>) => onSubmitClicked_(event)}>Save</Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
export default FormOverstayPersonnel
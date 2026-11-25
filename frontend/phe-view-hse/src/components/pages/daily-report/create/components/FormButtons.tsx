import {Button} from "@/components/ui/button";
import * as React from "react";
import {UseFormReturn} from "react-hook-form";

type Props = {
  form: UseFormReturn<any>;
  isBackShowed?: boolean;
  isNextShowed?: boolean;
  onBackClick?(): void;
  onNextClick?(obj: Record<any, any>): void;
  backLabel?: string;
  nextLabel?: string;
}

const FormButtons = ({
                       form,
                       isBackShowed = true,
                       isNextShowed = true,
                       onBackClick,
                       onNextClick,
                       backLabel = "Back",
                       nextLabel = "Save"
                     }: Props) => {

  const onNextClick_ = async () => {
    const isValid = await form.trigger();

    if (isValid) {
      if (onNextClick) {
        onNextClick(form.getValues());
      }
    }
  }

  return (
    <div className={"flex flex-row mt-2 p-0 justify-between"}>
      {/*{isBackShowed ? <Button variant={"destructive"} className={""} onClick={(e) => {*/}
      {/*  if (onBackClick) {*/}
      {/*    e.preventDefault();*/}
      {/*    onBackClick()*/}
      {/*  }*/}
      {/*}}>{backLabel}</Button> : <div/>}*/}
      {isNextShowed ? <Button className={""} onClick={(e) => {
        if (onNextClick) {
          e.preventDefault();
          onNextClick_().then(() => {})
        }
      }}>{nextLabel}</Button> : <div/>}
    </div>
  )
}
export default FormButtons;
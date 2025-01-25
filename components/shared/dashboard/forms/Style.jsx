"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import moment from "moment";

// Form handling utilities
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { StyleFormSchema } from "@/lib/schemas";
import { AlertDialog } from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState } from "react";

const StyleForm = ({ user, style, userType, type, setOpen }) => {
  console.log(style);
  const router = useRouter();
  const form = useForm({
    mode: "onChange", // form validation mode
    resolver: zodResolver(StyleFormSchema), // resolver for form validation
    defaultValues: {
      // setting default form values from data (if available)
      styleName: style?.styleName || "",
      rank: style?.rank || "",
      //promotionDate: data?.promotionDate || "",
      division: style?.division || "",
      weightClass: style?.weightClass || "",
      grip: style?.grip || "",
      favoriteTechnique: style?.favoriteTechnique || "",
    },
  });

  // Date picker from shadcn ui isn't working so I've add it as a separate input
  // Setting the inital date value if data exists
  const [promotionDate, setPromotionDate] = useState(
    style?.promotionDate ? moment(style.promotionDate).format("yyyy-MM-DD") : ""
  );

  const isLoading = form.formState.isSubmitting;

  //const [promotionDate, setPromotionDate] = useState("");

  const handleSubmit = async (values) => {
    values.promotionDate = promotionDate;
    // console.log("VALUES ", values);
    // console.log(promotionDate);

    try {
      console.log(style._id);
      if (userType === "user") {
        let domain = "";
        if (style._id) {
          domain = `${process.env.NEXT_PUBLIC_API_DOMAIN}/dashboard/${user._id}/userStyles/${style._id}`;
        } else {
          domain = `${process.env.NEXT_PUBLIC_API_DOMAIN}/dashboard/${user._id}/userStyles`;
        }
        console.log(domain);
        const response = await fetch(
          domain,
          //`${process.env.NEXT_PUBLIC_API_DOMAIN}/dashboard/${user._id}/userStyles`,
          {
            method: `${style?._id ? "PATCH" : "POST"}`,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type, Authorization",
              "Content-type": "application/json; charset=UTF-8",
            },
            body: JSON.stringify({
              styleName: values.styleName,
              rank: values.rank,
              promotionDate: values.promotionDate,
              division: values.division,
              weightClass: values.weightClass,
              grip: values.grip,
              favoriteTechnique: values.favoriteTechnique,
            }),
          }
        );
        const data = await response.json();
        console.log(data);
        if (data.status === 201 || data.status === 200) {
          const timer = setTimeout(() => {
            router.refresh();
            toast.success(data.message, {
              position: "top-right",
              autoClose: 5000,
              hideProgressBar: false,
              closeOnClick: false,
              pauseOnHover: true,
              draggable: true,
              progress: undefined,
              theme: "light",
            });
            setOpen(false);
          }, 1000);
          return () => clearTimeout(timer);
        } else {
          toast.error(data.message);
        }
      }
    } catch (error) {
      console.log(error);
      //toast.error(error.message);
    }
  };
  console.log("STYLE FORM");
  return (
    <AlertDialog>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Style/Sport</CardTitle>
          <CardDescription>
            {style?._id
              ? `Update ${style?.styleName} style information`
              : "Add a user style.  You can edit this style later from the style/sport tab on your dashboard page."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4"
            >
              <FormField
                disabled={isLoading}
                control={form.control}
                name="styleName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Style/Sport</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Style/Sport" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Brazilian Jiu Jitsu">
                          Brazilian Jiu Jitsum
                        </SelectItem>
                        <SelectItem value="Judo">Judo</SelectItem>
                        <SelectItem value="Wrestling">Wrestling</SelectItem>
                      </SelectContent>
                    </Select>

                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                disabled={isLoading}
                control={form.control}
                name="rank"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>
                      {" "}
                      {`${
                        userType === "familyMember"
                          ? user.firstName + "'s"
                          : "My"
                      }  rank`}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Rank"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-900 dark:text-gray-100 font-bold leading-tight focus:outline-ms-blue focus:shadow-outline"
                type="date"
                id="promotionDate"
                name="promotionDate"
                placeholder="Enter promotion date"
                defaultValue={promotionDate}
                onChange={(e) => setPromotionDate(e.target.value)}
              />

              <FormField
                disabled={isLoading}
                control={form.control}
                name="division"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>
                      {" "}
                      {`${
                        userType === "familyMember"
                          ? user.firstName + "'s"
                          : "My"
                      }  division`}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Division"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                disabled={isLoading}
                control={form.control}
                name="weightClass"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>
                      {" "}
                      {`${
                        userType === "familyMember"
                          ? user.firstName + "'s"
                          : "My"
                      }  weight class`}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Weight class"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="grip"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>
                      {" "}
                      {`${
                        userType === "familyMember"
                          ? user.firstName + "'s"
                          : "My"
                      }  grip/stance`}{" "}
                      (Lefty or Righty)
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="righty" />
                          </FormControl>
                          <FormLabel className="font-normal">Righty</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="lefty" />
                          </FormControl>
                          <FormLabel className="font-normal">Lefty</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                disabled={isLoading}
                control={form.control}
                name="favoriteTechnique"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>
                      {" "}
                      {`${
                        userType === "familyMember"
                          ? user.firstName + "'s"
                          : "My"
                      }  favorite technique`}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Favorite technique"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex items-center justify-center">
                <Button
                  type="submit"
                  className="bg-gray-900 hover:bg-gray-500  border-gray-500 dark:border-gray-100 border-2 drop-shadow-md text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mt-4"
                >
                  {isLoading
                    ? "loading..."
                    : style?._id
                    ? "Update style"
                    : "Add Style"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </AlertDialog>
  );
};

export default StyleForm;

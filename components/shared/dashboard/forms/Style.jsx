"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

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

const StyleForm = ({ user, data, userType, type }) => {
  const form = useForm({
    mode: "onChange", // form validation mode
    resolver: zodResolver(StyleFormSchema), // resolver for form validation
    defaultValues: {
      // setting default form values from data (if available)
      styleName: data?.styleName,
      rank: data?.rank,
      promotionDate: data?.promotionDate,
      division: data?.division,
      weightClass: data?.weightClass,
      grip: data?.grip,
      favoriteTechnique: data?.favoriteTechnique,
    },
  });

  const isLoading = form.formState.isSubmitting;

  const handleSubmit = async (values) => {
    console.log("VALUES ", values);
  };
  return (
    <AlertDialog>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Style/Sport</CardTitle>
          <CardDescription>
            {data?.id
              ? `Update ${data?.styleName} style information`
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

              <FormField
                control={form.control}
                name="dob"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date of birth</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-[240px] pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto p-0"
                        align="start"
                      >
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Your date of birth is used to calculate your age.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
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
                        className=" focus-visible:outline-2"
                        placeholder="Rank"
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
                  disabled={isLoading}
                  className="bg-gray-900 hover:bg-gray-500  border-gray-500 dark:border-gray-100 border-2 drop-shadow-md text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mt-4"
                >
                  {isLoading
                    ? "loading..."
                    : data?.id
                    ? "Save category information"
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

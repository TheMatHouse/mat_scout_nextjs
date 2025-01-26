// React and Nextjs
import React, { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

// Shadcn ui components
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
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Components for Shadcn ui form
import { MatchReportSchema } from "@/lib/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

// Moment to formate date for date picker
import moment from "moment";

// Reac tags for adding techniques used
import { ReactTags } from "react-tag-autocomplete";

// ReactQuill WYSIWYG editor and tool tip component
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import Tooltip from "@/components/shared/Tooltip";

import Countries from "@/assets/countries.json";

// Icons from lucide React
import { CircleHelp } from "lucide-react";

const MatchReportForm = ({ match, styles, techniques }) => {
  const router = useRouter();

  const [opponentAttackNotes, setOpponentAttackNotes] = useState("");
  const [athleteAttackNotes, setAthleteAttackNotes] = useState("");

  const form = useForm({
    mode: "onChange", // Form validation mode
    resolver: zodResolver(MatchReportSchema),
    defaultValues: {
      matchType: match?.matchType || "",
      eventName: match?.eventName || "",
      division: match?.division || "",
      weightCategory: match?.weightCategory || "",
      opponentName: match?.opponentName || "",
      opponentClub: match?.opponentClub || "",
      opponentRank: match?.opponentRank || "",
      opponentGrip: match?.opponentGrip || "",
      opponentCountry: match?.opponentCountry || "",
      opponentTechniques: match?.opponentTechniques || "",
      opponentAttackNotes: match?.opponentAttackNotes || "",
      athleteTechniques: match?.athleteTechniques || "",
      athleteAttackNotes: match?.athleteAttackNotes || "",
      result: match?.result || "",
      score: match?.score || "",
      videoTitle: match?.videoTitle || "",
      videoURL: match?.videoURL || "",
      isPublic: match?.isPublic || "",
    },
  });

  const isLoading = form.formState.isSubmitting;
  const [matchDate, setMatchDate] = useState(
    match?.matchDate ? moment(match.matchDate).format("yyyy-MM-DD") : ""
  );

  const techniqueList = [];
  techniques?.map((technique) => techniqueList.push(technique.techniqueName));

  const [selected, setSelected] = useState([]);

  const suggestions = techniqueList.map((name, index) => ({
    value: index,
    label: name,
  }));

  // Opponent Attacks
  const [opponentAttacks, setOpponentAttacks] = useState([]);

  const onOpponentAdd = useCallback(
    (newTag) => {
      setSelected([...selected, newTag]);
    },
    [selected]
  );

  const onOpponentDelete = useCallback(
    (tagIndex) => {
      setSelected(selected.filter((_, i) => i !== tagIndex));
    },
    [selected]
  );

  const handleSubmit = () => {};
  return (
    <AlertDialog>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Match Report</CardTitle>
          <CardDescription>
            {match?._id ? "Update this match report" : "Add a new match report"}
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
                          <SelectValue placeholder="Select event type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {styles &&
                          styles.map((style) => (
                            <SelectItem
                              key={style._id}
                              value={style.styleName}
                            >
                              {style.styleName}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                disabled={isLoading}
                control={form.control}
                name="eventName"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Event Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Event Name"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                disabled={isLoading}
                control={form.control}
                name="matchDate"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Match Date</FormLabel>
                    <FormControl>
                      <input
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-900 dark:text-gray-100 font-bold leading-tight focus:outline-ms-blue focus:shadow-outline border-1"
                        type="date"
                        id="matchDate"
                        name="matchDate"
                        placeholder="Enter match date"
                        defaultValue={matchDate}
                        onChange={(e) => setMatchDate(e.target.value)}
                      />
                    </FormControl>
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
                      Division (Masters, Jr Boys, Senior Women, etc)
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Division"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                disabled={isLoading}
                control={form.control}
                name="weightCategory"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel> Weight Category</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Weight Category"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                disabled={isLoading}
                control={form.control}
                name="opponentName"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Opponent's Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Opponent's Name"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                disabled={isLoading}
                control={form.control}
                name="opponentClub"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Opponent's Club</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Opponent's Club"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                disabled={isLoading}
                control={form.control}
                name="opponentRank"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Opponent's Rank</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Opponent's Rank"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                disabled={isLoading}
                control={form.control}
                name="opponentCountry"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Opponent's Country</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Opponent's Country"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="opponentGrip"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>
                      Opponent's grip/stance (Lefty or Righty)
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
                  </FormItem>
                )}
              />

              <FormField
                disabled={isLoading}
                control={form.control}
                name="opponentsTechniques"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Opponent's Techniques Used</FormLabel>
                    <div className="max-w-md">
                      <Tooltip
                        alt="Opponent techniques used tooltip"
                        text={`Click inside the box below. A list of techniques already
                            in our database will appear. Click on a technique to
                            selected it. The selected techniques will appear above the
                            box.
                            <br /><br />
                            If a technique is not in the database, you can add your
                            technique by typing it in and then clicking on "Add" next
                            to your technique. If you added a technique by mistake,
                            you can click on the technique name above the box and it
                            will removed`}
                      >
                        <CircleHelp />
                      </Tooltip>
                    </div>
                    <FormControl>
                      <ReactTags
                        labelText="Select techniques"
                        selected={selected}
                        suggestions={suggestions}
                        onAdd={onOpponentAdd}
                        onDelete={onOpponentDelete}
                        allowNew="true"
                        allowResize="true"
                        collapseOnSelect="true"
                        deleteButtonText="true"
                        placeholderText="Press enter to add opponent technique"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="opponentAttackNotes"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Notes on opponent's attacks</FormLabel>
                    <FormControl>
                      <ReactQuill
                        theme="snow"
                        id="opponentAttackNotes"
                        name="opponentAttackNotes"
                        className="quill-editor"
                        onChange={setOpponentAttackNotes}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </CardContent>
      </Card>
    </AlertDialog>
  );
};

export default MatchReportForm;

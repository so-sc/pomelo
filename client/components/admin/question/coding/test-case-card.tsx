"use client";

import { useFormContext, useFieldArray } from "react-hook-form";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardDescription,
} from "@/components/ui/card";
import {
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
    SelectGroup,
    SelectLabel,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Beaker, Plus, Trash2, Code2 } from "lucide-react";
import { TYPE_REGISTRY, emptyValue, validateProblemConfig } from "@pomelo/code-gen";
import { ValueEditor } from "./editors";

const TYPE_GROUPS: [string, string[]][] = Object.entries(
    Object.entries(TYPE_REGISTRY).reduce<Record<string, string[]>>((groups, [type, record]) => {
        (groups[record.group] ||= []).push(type);
        return groups;
    }, {})
);

export default function TestCaseCard() {
    const { control, watch } = useFormContext();

    const {
        fields: variableFields,
        append: appendVariable,
        remove: removeVariable,
    } = useFieldArray({
        control,
        name: "inputVariables",
    });

    const {
        fields: testCaseFields,
        append: appendTestCase,
        remove: removeTestCase,
    } = useFieldArray({
        control,
        name: "testCases",
    });

    const inputVariables = watch("inputVariables") || [];
    const functionName = watch("functionName");

    const signatureErrors = validateProblemConfig({
        method: functionName,
        input: inputVariables,
    });
    const isVariableInvalid = signatureErrors.length > 0;

    const emptyInput = () =>
        Object.fromEntries(
            inputVariables.map((v: { variable: string; type: string }) => [v.variable, emptyValue(v.type)])
        );

    return (
        <div className="space-y-6">
            {/* Function Signature Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Code2 className="h-5 w-5 text-primary" />
                        Function Signature
                    </CardTitle>
                    <CardDescription>
                        Define the function name and input parameters.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <FormField
                        control={control}
                        name="functionName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Function Name</FormLabel>
                                <FormControl>
                                    <Input {...field} placeholder="e.g. solve" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <FormLabel className="text-base">Input Variables</FormLabel>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => appendVariable({ variable: "", type: "int" })}
                                disabled={testCaseFields.length > 0}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Variable
                            </Button>
                        </div>

                        {variableFields.map((field, index) => (
                            <div key={field.id} className="flex items-start gap-4">
                                <FormField
                                    control={control}
                                    name={`inputVariables.${index}.variable`}
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormControl>
                                                <Input {...field} placeholder="Variable Name" disabled={testCaseFields.length > 0} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={control}
                                    name={`inputVariables.${index}.type`}
                                    render={({ field }) => (
                                        <FormItem className="w-[180px]">
                                            <Select
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                                disabled={testCaseFields.length > 0}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {TYPE_GROUPS.map(([group, types]) => (
                                                        <SelectGroup key={group}>
                                                            <SelectLabel>{group}</SelectLabel>
                                                            {types.map((type) => (
                                                                <SelectItem key={type} value={type}>
                                                                    {type}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectGroup>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive"
                                    aria-label="Remove variable"
                                    onClick={() => removeVariable(index)}
                                    disabled={testCaseFields.length > 0}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                        {variableFields.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
                                No input variables defined.
                            </p>
                        )}
                        {variableFields.length > 0 && signatureErrors.map((message) => (
                            <p key={message} className="text-sm text-destructive mt-2 font-medium">
                                {message}
                            </p>
                        ))}
                    </div>
                    {testCaseFields.length > 0 && (
                        <p className="text-sm text-yellow-600 dark:text-yellow-500 bg-yellow-50 dark:bg-yellow-950/20 p-2 rounded border border-yellow-200 dark:border-yellow-800">
                            ⚠️ Clear test cases to modify input variables.
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Test Cases Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Beaker className="h-5 w-5 text-primary" />
                        Test Cases
                    </CardTitle>
                    <CardDescription>
                        Add test cases based on the defined input variables.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {(!inputVariables || inputVariables.length === 0) ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Define input variables above to add test cases.
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-end gap-2 items-center flex-wrap">
                                {isVariableInvalid && (
                                    <span className="text-xs text-destructive">
                                        Fix the function signature to add test cases
                                    </span>
                                )}

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => appendTestCase({ input: emptyInput(), output: "", explanation: "", isVisible: false })}
                                    disabled={isVariableInvalid}
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Test Case
                                </Button>
                            </div>

                            <div className="space-y-6">
                                {testCaseFields.map((field, index) => (
                                    <div
                                        key={field.id}
                                        className="p-4 border rounded-lg space-y-4 bg-muted/30"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <h4 className="font-medium text-sm">Test Case {index + 1}</h4>
                                                <FormField
                                                    control={control}
                                                    name={`testCases.${index}.isVisible`}
                                                    render={({ field }) => (
                                                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                                            <FormControl>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={field.value}
                                                                    onChange={field.onChange}
                                                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                                />
                                                            </FormControl>
                                                            <FormLabel className="text-xs font-normal cursor-pointer">
                                                                Visible to User
                                                            </FormLabel>
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive"
                                                aria-label="Remove test case"
                                                onClick={() => removeTestCase(index)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Inputs Generation */}
                                            <div className="space-y-3 p-3 bg-background/50 rounded-md border">
                                                <span className="text-xs font-semibold uppercase text-muted-foreground">Input</span>
                                                {inputVariables.map((variable: { variable: string; type: string }, vIndex: number) => (
                                                    <FormField
                                                        key={`${field.id}-input-${vIndex}`}
                                                        control={control}
                                                        name={`testCases.${index}.input.${variable.variable}`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-xs">{variable.variable} <span className="text-muted-foreground font-normal">({variable.type})</span></FormLabel>
                                                                <FormControl>
                                                                    <ValueEditor
                                                                        type={variable.type}
                                                                        value={field.value}
                                                                        onChange={field.onChange}
                                                                        variable={variable.variable}
                                                                    />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                ))}
                                            </div>

                                            {/* Output */}
                                            <div className="space-y-3 p-3 bg-background/50 rounded-md border">
                                                <span className="text-xs font-semibold uppercase text-muted-foreground">Expected Output</span>
                                                <FormField
                                                    control={control}
                                                    name={`testCases.${index}.output`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormControl>
                                                                <Textarea
                                                                    {...field}
                                                                    placeholder="Expected output"
                                                                    className="min-h-[100px] resize-none font-mono text-sm"
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-3 p-3 bg-background/50 rounded-md border">
                                            <span className="text-xs font-semibold uppercase text-muted-foreground">Explanation (optional)</span>
                                            <FormField
                                                control={control}
                                                name={`testCases.${index}.explanation`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Textarea
                                                                {...field}
                                                                value={field.value ?? ""}
                                                                placeholder="Shown to users alongside this example, e.g. why the output is what it is"
                                                                className="min-h-17.5 resize-none text-sm"
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>
                                ))}
                                {testCaseFields.length === 0 && (
                                    <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
                                        No test cases added.
                                    </p>
                                )}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div >
    );
}

---
title: 'Reducing AWS Costs With Step Functions'
date: '2018-11-11'
tags: ['AWS', 'Lambda', 'Step Functions', 'PCI Cloud']
type: 'blog'
---
<!---
Before anything: 70% ebs, 30% instance, 0% snapshot
Before os snapshot: 55% ebs, 43% instance, 2% snapshot
After os snapshot: 25% ebs, 67% instanc, 8% snapshot
--->

Cutting AWS EC2 on-demand spending by half may seem like crazy talk but at Power Costs, Inc. (PCI) we achieved this by
automating the shutdown and snapshotting of our instances. It's been about 2 years since we moved the majority of our
internal development servers to AWS EC2. This has given us new levels of capability and flexibility and the monetary
costs that comes with it.

When we first started out on our move to the cloud we decided to crate a simple CLI app for users. This app talks to a
server that performs all the AWS API calls and tracks instance state and metadata. In the beginning we focused on the
basics: create, stop, start and terminate. This gave us good fundamental knowledge about how AWS and EC2 worked. We also
added an automatic shutdown of any instance that was online at 7 PM to keep initial costs under control.

As usage of our service grew we started analyzing what the majority of our cost was going to. Turns out that over 70% of
our cost was due to EBS volume storage/space. This is because of two main reasons:

1. Databases running on EC2 needed anywhere form 30 to 900 GB of volume space
2. Users create a new database, use it once and never clean it up

To begin reducing our EBS usage we decided to snapshot each database as it was shutdown. Because we would be deleting
and creating volumes whatever we did needed to be robust. We considered writing our own implementation but discovered an
Amazon service that fit the bill.

_Sample code and services refrenced in this post are available on
[Github](https://github.com/powercosts/ebs-sf-example)._

## AWS Step Functions

Step Functions enable coordination of many AWS services into a serverless workflow. Step Functions are built out of
task, choice and wait states to control your workflow. Coca-Cola gave a great talk at re:Invent on how they use Step
Functions for creating nutrition labels.

Our Step Functions are chains of AWS Lambda functions that call the AWS EC2 API. These Step Functions shutdown an
instance and convert its EBS volumes to snapshots. Because Step Functions include a wait and choice state this enables
easy looping. Instead of waiting inside a Lambda function for a snapshot to complete we output the current status into
the Step Function state. Then we check that output and verify that the action was successful. If it wasn't then we wait
for a period of time and loop back to the check status function. If it was successful we go to the next step in the
workflow.

![Stop Step Function](stop-step-function.png)

When starting an environment, we reverse the process.

![Start Step Function](start-step-function.png)

By using these Step Functions with PCI Cloud, we were able to reduce our operating costs by half. The CFO was quite
happy about that.

## Drawbacks

There are some drawbacks to this approach. First, there is a [known performance degradation of an uninitialized
volume](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ebs-initialize.html). The OS has to sit and wait around for
EBS to fetch blocks from S3 before they can be used available to the OS. We have noticed that some database queries will be
slow the first time they are ran then normal speeds every time after that. Since all PCI Cloud environments are not
business critical, this is something we have been willing to accept.

Second, increased startup and shutdown time. Currently in PCI Cloud it takes about 7 minutes to thaw out and start up
the EC2 instances and about 15 minutes to reverse the process on shutdown. Shutdown takes longer because we stop all
the application servers first to give the database a chance to close connections and exit.

## Other Considerations

One thing to keep in mind when designing a Step Function is secure loop iteration. If you have an array of objects that
need an action performed on them that should only done once (like detaching an EBS volume) have one Lambda
function that performs work on one element of the array, and another that increments the index.
This allows you to retry an action if your API action if it gets throttled or leave your service in an exact
state after an error. [Here is a great example from the Step Function
docs](https://docs.aws.amazon.com/step-functions/latest/dg/tutorial-create-iterate-pattern-section.html#create-iterate-pattern-step-1)
on how to do this and you can see our Iterator lambda
[here](https://github.com/powercosts/ebs-sf-example/blob/master/src/functions/iterate.ts) and see it in action below.

`gist:chadjvw/21c61b092767562b4fcb42d7f5ee1653#step-function-iterator.yml`

Another great feature of Step Functions is the Retry block. While Amazon's SDKs automatically retries throttled
exceptions, we have noticed that during times of high traffic we need to retry the entire request. Amazon has a pattern
for [error retry and exponential backoff](https://docs.aws.amazon.com/general/latest/gr/api-retries.html), but this
block allows you to automatically retry the step with an exponential backoff algorithm if the step fails with the name
of an exception in the retry block eliminating the need implement this logic by hand in each lambda. Here is a list of
the various exception names that we have discovered through trial and error cover the various throttling exceptions in
the EC2 and EBS APIs.

`gist:chadjvw/21c61b092767562b4fcb42d7f5ee1653#step-function-retry.yml`

## Final Thoughts

More to follow.
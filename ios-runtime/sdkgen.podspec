Pod::Spec.new do |spec|  
    spec.name                    = 'sdkgen'
    spec.version                 = '1.0.0'
    spec.summary                 = 'Cubos sdkgen.'
    spec.homepage                = 'http://cubos.io'

    spec.author                  = 'Cubos'
    spec.license                 = { :type => "Copyright", :text => "Copyright 2020 Cubos. All Rights Reserved." }

    spec.platform                = :ios
    # s.source                  = { :http => 'https://storage.googleapis.com/aarin-ios-framework/aarin-1.0.2.zip' }
    spec.source                  = { :http => 'file:' + __dir__ + '/sdkgen-1.0.0.zip' }

    spec.ios.vendored_frameworks = 'SdkgenRuntime.framework'

    spec.ios.deployment_target = '12.1'
    spec.pod_target_xcconfig = { 'EXCLUDED_ARCHS[sdk=iphonesimulator*]' => 'arm64' }
    spec.user_target_xcconfig = { 'EXCLUDED_ARCHS[sdk=iphonesimulator*]' => 'arm64' }


    spec.dependency 'Alamofire', "~> 5.4"
    spec.dependency 'KeychainSwift'

end 